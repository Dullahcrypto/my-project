import argparse
import os
import re
import sys
import time
import logging
import requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import telebot

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# ── Credentials ───────────────────────────────────────────────────────────────
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID        = os.getenv("CHAT_ID")

bot = telebot.TeleBot(TELEGRAM_TOKEN) if TELEGRAM_TOKEN else None

# ── RPC rotation (tries each in order, skips on 429 / error) ─────────────────
_user_rpc = os.getenv("SOLANA_RPC")
RPC_ENDPOINTS: list[str] = list(dict.fromkeys(filter(None, [
    _user_rpc,
    "https://api.mainnet-beta.solana.com",
    "https://rpc.ankr.com/solana",
])))

# ── Tunable parameters ────────────────────────────────────────────────────────
SPIKE_MULTIPLIER    = float(os.getenv("SPIKE_MULTIPLIER", 5.0))
MIN_5MIN_VOL        = float(os.getenv("MIN_5MIN_VOL", 20_000))
MIN_LIQUIDITY_USD   = float(os.getenv("MIN_LIQUIDITY_USD", 10_000))
MAX_WHALE_PCT       = float(os.getenv("MAX_WHALE_PCT", 60.0))
MAX_RUG_SCORE       = float(os.getenv("MAX_RUG_SCORE", 500))   # RugCheck normalised 0-1000
MIN_LP_LOCKED_PCT   = float(os.getenv("MIN_LP_LOCKED_PCT", 50.0))
MAX_TOKEN_AGE_HOURS = float(os.getenv("MAX_TOKEN_AGE_HOURS", 1.0))
ALERT_COOLDOWN_MIN  = int(os.getenv("ALERT_COOLDOWN_MIN", 30))
CHECK_INTERVAL_SEC  = int(os.getenv("CHECK_INTERVAL_SEC", 45))
HEARTBEAT_INTERVAL  = int(os.getenv("HEARTBEAT_INTERVAL", 3600))

# ── State ─────────────────────────────────────────────────────────────────────
seen_pairs: dict[str, datetime] = {}


# ── Helpers ───────────────────────────────────────────────────────────────────
def escape_md(text: str) -> str:
    if not isinstance(text, str):
        text = str(text)
    return re.sub(r'([_*\[\]()~`>#\+\-=|{}.!])', r'\\\1', text)


def _dex_headers() -> dict:
    return {"User-Agent": "Mozilla/5.0 (compatible; SolSniperBot/1.0)"}


# ── 1. Fetch Solana pairs ─────────────────────────────────────────────────────
def fetch_solana_pairs() -> list[dict]:
    queries = ["SOL", "USDC", "USDT"]
    seen_addrs: dict[str, dict] = {}

    for q in queries:
        try:
            url  = f"https://api.dexscreener.com/latest/dex/search?q={q}"
            resp = requests.get(url, timeout=15, headers=_dex_headers())
            resp.raise_for_status()
            for pair in resp.json().get("pairs", []):
                if pair.get("chainId") != "solana":
                    continue
                addr = pair.get("pairAddress")
                if addr and addr not in seen_addrs:
                    seen_addrs[addr] = pair
            time.sleep(0.8)
        except Exception as e:
            logger.error(f"DexScreener query '{q}' failed: {e}")

    logger.info(f"Fetched {len(seen_addrs)} unique Solana pairs")
    return list(seen_addrs.values())


# ── 2. Volume spike detection ─────────────────────────────────────────────────
def volume_spike_detected(pair: dict) -> bool:
    vol = pair.get("volume", {})
    v5  = float(vol.get("m5") or 0)
    v1h = float(vol.get("h1") or 0)

    if v5 < MIN_5MIN_VOL:
        return False
    if v1h <= 0:
        return v5 >= MIN_5MIN_VOL * 2
    return v5 > SPIKE_MULTIPLIER * (v1h / 12.0)


# ── 3. Token age ──────────────────────────────────────────────────────────────
def is_fresh_pair(pair: dict) -> bool:
    ts = pair.get("pairCreatedAt")
    if not ts:
        return True
    created = datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
    age_h = (datetime.now(timezone.utc) - created).total_seconds() / 3600
    return age_h <= MAX_TOKEN_AGE_HOURS


def age_str(pair: dict) -> str:
    ts = pair.get("pairCreatedAt")
    if not ts:
        return "unknown"
    age_s = datetime.now(timezone.utc).timestamp() - ts / 1000
    return f"{age_s/60:.0f}m" if age_s < 3600 else f"{age_s/3600:.1f}h"


# ── 4. RugCheck (primary safety filter) ──────────────────────────────────────
def check_rugcheck(token_mint: str) -> tuple[bool, str, float]:
    """
    Returns (is_safe, risk_summary, lp_locked_pct).
    Skips tokens with score > MAX_RUG_SCORE or LP lock < MIN_LP_LOCKED_PCT.
    """
    if not token_mint:
        return True, "no mint", 0.0
    try:
        url  = f"https://api.rugcheck.xyz/v1/tokens/{token_mint}/report/summary"
        resp = requests.get(url, timeout=12, headers=_dex_headers())
        resp.raise_for_status()
        data = resp.json()

        score      = float(data.get("score_normalised") or 0)
        lp_locked  = float(data.get("lpLockedPct") or 0)
        risks      = data.get("risks", [])
        danger_tags = [r["name"] for r in risks if r.get("level") == "danger"]
        warn_tags   = [r["name"] for r in risks if r.get("level") == "warn"]

        risk_parts = []
        if danger_tags:
            risk_parts.append("⛔ " + ", ".join(danger_tags[:2]))
        elif warn_tags:
            risk_parts.append("⚠️ " + ", ".join(warn_tags[:2]))
        else:
            risk_parts.append("✅ clean")

        summary = f"score {score:.0f} | LP {lp_locked:.1f}% locked | {', '.join(risk_parts)}"

        if score > MAX_RUG_SCORE:
            return False, summary, lp_locked
        if lp_locked < MIN_LP_LOCKED_PCT:
            return False, summary, lp_locked

        return True, summary, lp_locked

    except Exception as e:
        logger.warning(f"RugCheck failed ({token_mint[:8]}…): {e}")
        return True, "rug check unavailable", 0.0


# ── 5. Whale concentration (Solana RPC with fallback) ─────────────────────────
def _rpc_post(payload: dict) -> dict | None:
    for endpoint in RPC_ENDPOINTS:
        try:
            resp = requests.post(
                endpoint, json=payload,
                headers={"Content-Type": "application/json"},
                timeout=12,
            )
            if resp.status_code == 429:
                logger.debug(f"RPC 429 on {endpoint}, trying next")
                continue
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.debug(f"RPC error on {endpoint}: {e}")
    return None


def check_whale_concentration(token_mint: str) -> tuple[bool, str]:
    if not token_mint:
        return True, "no mint"
    try:
        holders_resp = _rpc_post({
            "jsonrpc": "2.0", "id": 1,
            "method": "getTokenLargestAccounts",
            "params": [token_mint, {"commitment": "finalized"}],
        })
        if not holders_resp:
            return True, "RPC unavailable"

        holders = holders_resp.get("result", {}).get("value", [])
        if not holders:
            return True, "no holder data"

        supply_resp = _rpc_post({
            "jsonrpc": "2.0", "id": 2,
            "method": "getTokenSupply",
            "params": [token_mint],
        })
        if not supply_resp:
            return True, "supply RPC unavailable"

        total = float((supply_resp.get("result", {}).get("value") or {}).get("uiAmount") or 0)
        if total <= 0:
            return True, "supply unknown"

        top10 = sum(float(h.get("uiAmount") or 0) for h in holders[:10])
        pct = top10 / total * 100
        is_safe = pct <= MAX_WHALE_PCT
        return is_safe, f"{pct:.1f}% held by top 10"

    except Exception as e:
        logger.warning(f"Whale check error ({token_mint[:8]}…): {e}")
        return True, "whale check unavailable"


# ── 6. Telegram / console alert ───────────────────────────────────────────────
def send_alert(pair: dict, rug_summary: str, whale_info: str, dry_run: bool) -> None:
    base      = pair.get("baseToken", {}) or {}
    name      = escape_md(base.get("name", "Unknown"))
    symbol    = escape_md(base.get("symbol", "???"))
    dex       = escape_md((pair.get("dexId") or "").upper())
    pair_addr = pair.get("pairAddress", "")
    mint      = base.get("address", "")

    vol       = pair.get("volume", {}) or {}
    price_usd = float(pair.get("priceUsd") or 0)
    liq_usd   = float((pair.get("liquidity") or {}).get("usd") or 0)
    v5        = float(vol.get("m5") or 0)
    v1h       = float(vol.get("h1") or 0)
    pc        = pair.get("priceChange", {}) or {}
    ch5       = float(pc.get("m5") or 0)
    ch1h      = float(pc.get("h1") or 0)
    listed    = escape_md(age_str(pair))

    msg = (
        f"🚀 *SOLANA VOLUME SPIKE*\n\n"
        f"🪙 *{name}* \\(`{symbol}`\\)\n"
        f"🏦 DEX: `{dex}` \\| ⏱ Listed: `{listed}`\n\n"
        f"💵 Price: `${price_usd:.8g}`\n"
        f"📈 5m: `{ch5:+.1f}%` \\| 1h: `{ch1h:+.1f}%`\n"
        f"💧 Liq: `${liq_usd:,.0f}`\n"
        f"🔊 Vol 5m: `${v5:,.0f}` \\| 1h: `${v1h:,.0f}`\n\n"
        f"🛡 Rug: {escape_md(rug_summary)}\n"
        f"🐳 Whale: {escape_md(whale_info)}\n\n"
        f"[DexScreener](https://dexscreener.com/solana/{pair_addr}) \\| "
        f"[Birdeye](https://birdeye\\.so/token/{mint}) \\| "
        f"[Solscan](https://solscan\\.io/token/{mint})"
    )

    if dry_run:
        print("\n" + "─" * 60)
        print(f"[DRY RUN] Alert for {base.get('symbol')} ({pair_addr[:8]}…)")
        print(f"  Liq ${liq_usd:,.0f}  Vol5m ${v5:,.0f}  Vol1h ${v1h:,.0f}")
        print(f"  Rug: {rug_summary}")
        print(f"  Whale: {whale_info}")
        print("─" * 60)
        return

    try:
        bot.send_message(
            CHAT_ID, msg,
            parse_mode="MarkdownV2",
            disable_web_page_preview=True,
        )
        logger.info(f"Alert → {base.get('symbol')} ({pair_addr[:8]}…)")
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")


def _tg(text: str, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY RUN] {text}")
        return
    if bot:
        try:
            bot.send_message(CHAT_ID, escape_md(text), parse_mode="MarkdownV2")
        except Exception as e:
            logger.warning(f"Telegram msg failed: {e}")


# ── Main loop ─────────────────────────────────────────────────────────────────
def main(dry_run: bool = False) -> None:
    mode = "DRY RUN" if dry_run else "LIVE"
    logger.info(f"🟢 Solana Sniper Bot starting [{mode}]")
    _tg(
        f"✅ Solana Sniper Bot online [{mode}]\n"
        f"Started {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        dry_run,
    )

    last_heartbeat = datetime.now(timezone.utc)

    while True:
        now   = datetime.now(timezone.utc)
        pairs = fetch_solana_pairs()

        stale = [k for k, v in seen_pairs.items() if (now - v) > timedelta(hours=2)]
        for k in stale:
            del seen_pairs[k]

        alerts_sent = 0

        for pair in pairs:
            pair_addr = pair.get("pairAddress")
            if not pair_addr:
                continue

            last_seen = seen_pairs.get(pair_addr)
            if last_seen and (now - last_seen) < timedelta(minutes=ALERT_COOLDOWN_MIN):
                continue

            liq = float((pair.get("liquidity") or {}).get("usd") or 0)
            if liq < MIN_LIQUIDITY_USD:
                continue
            if not is_fresh_pair(pair):
                continue
            if not volume_spike_detected(pair):
                continue

            mint = (pair.get("baseToken") or {}).get("address", "")

            # RugCheck (primary — always run)
            rug_safe, rug_summary, _ = check_rugcheck(mint)
            if not rug_safe:
                logger.info(f"Skipped {pair_addr[:8]} — rug risk ({rug_summary})")
                continue

            # Whale check (secondary — soft fail)
            whale_safe, whale_info = check_whale_concentration(mint)
            if not whale_safe:
                logger.info(f"Skipped {pair_addr[:8]} — whale concentration ({whale_info})")
                continue

            send_alert(pair, rug_summary, whale_info, dry_run)
            seen_pairs[pair_addr] = now
            alerts_sent += 1
            time.sleep(0.5)

        if (now - last_heartbeat).total_seconds() >= HEARTBEAT_INTERVAL:
            _tg(
                f"🫀 Bot alive | {len(pairs)} pairs scanned | {len(seen_pairs)} tracked",
                dry_run,
            )
            last_heartbeat = now

        logger.info(
            f"Cycle done — {len(pairs)} pairs, {alerts_sent} alerts, "
            f"sleeping {CHECK_INTERVAL_SEC}s"
        )
        time.sleep(CHECK_INTERVAL_SEC)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Solana Telegram Sniper Bot")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print alerts to console instead of sending to Telegram"
    )
    parser.add_argument(
        "--test-cycle", action="store_true",
        help="Run one cycle, print results, then exit"
    )
    args = parser.parse_args()

    if args.test_cycle:
        logger.info("Running single test cycle…")
        pairs = fetch_solana_pairs()
        logger.info(f"Got {len(pairs)} pairs")
        hits = [p for p in pairs if volume_spike_detected(p)]
        logger.info(f"Volume spikes detected: {len(hits)}")
        for p in hits[:3]:
            b = p.get("baseToken", {})
            vol = p.get("volume", {})
            liq = float((p.get("liquidity") or {}).get("usd") or 0)
            logger.info(
                f"  {b.get('symbol')} | liq ${liq:,.0f} | "
                f"v5m ${float(vol.get('m5') or 0):,.0f} | "
                f"v1h ${float(vol.get('h1') or 0):,.0f}"
            )
        sys.exit(0)

    main(dry_run=args.dry_run)
