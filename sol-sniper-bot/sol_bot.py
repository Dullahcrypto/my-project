import os
import re
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

# ── Credentials ──────────────────────────────────────────────────────────────
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID        = os.getenv("CHAT_ID")
SOLANA_RPC     = os.getenv("SOLANA_RPC", "https://api.mainnet-beta.solana.com")

bot = telebot.TeleBot(TELEGRAM_TOKEN)

# ── Tunable parameters ────────────────────────────────────────────────────────
SPIKE_MULTIPLIER      = float(os.getenv("SPIKE_MULTIPLIER", 5.0))   # 5x volume spike
MIN_5MIN_VOL          = float(os.getenv("MIN_5MIN_VOL", 30_000))     # $30k
MIN_LIQUIDITY_USD     = float(os.getenv("MIN_LIQUIDITY_USD", 15_000))# $15k
MAX_WHALE_PCT         = float(os.getenv("MAX_WHALE_PCT", 60.0))      # top-10 holders <60%
MAX_TOKEN_AGE_HOURS   = float(os.getenv("MAX_TOKEN_AGE_HOURS", 1.0)) # new pairs only
ALERT_COOLDOWN_MIN    = int(os.getenv("ALERT_COOLDOWN_MIN", 30))
CHECK_INTERVAL_SEC    = int(os.getenv("CHECK_INTERVAL_SEC", 45))
HEARTBEAT_INTERVAL    = int(os.getenv("HEARTBEAT_INTERVAL", 3600))

# ── State ─────────────────────────────────────────────────────────────────────
seen_pairs: dict[str, datetime] = {}


# ── Helpers ───────────────────────────────────────────────────────────────────
def escape_md(text: str) -> str:
    if not isinstance(text, str):
        text = str(text)
    return re.sub(r'([_*\[\]()~`>#\+\-=|{}.!])', r'\\\1', text)


def _dex_headers() -> dict:
    return {"User-Agent": "Mozilla/5.0 (compatible; SolSniperBot/1.0)"}


# ── 1. Fetch Solana pairs from DexScreener ────────────────────────────────────
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
        # no hourly data yet — treat large 5-min volume alone as a spike
        return v5 >= MIN_5MIN_VOL * 2
    expected_5min = v1h / 12.0
    return v5 > SPIKE_MULTIPLIER * expected_5min


# ── 3. Token age filter ───────────────────────────────────────────────────────
def is_fresh_pair(pair: dict) -> bool:
    created_at_ms = pair.get("pairCreatedAt")
    if not created_at_ms:
        return True  # no data — don't filter out
    created = datetime.fromtimestamp(created_at_ms / 1000, tz=timezone.utc)
    age_h = (datetime.now(timezone.utc) - created).total_seconds() / 3600
    return age_h <= MAX_TOKEN_AGE_HOURS


# ── 4. Whale concentration via Solana RPC ────────────────────────────────────
def _rpc_post(payload: dict) -> dict:
    resp = requests.post(
        SOLANA_RPC,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def check_whale_concentration(token_mint: str) -> tuple[bool, str]:
    """
    Returns (is_safe, description).
    Uses Solana RPC getTokenLargestAccounts + getTokenSupply (no API key needed).
    """
    if not token_mint:
        return True, "No mint address"

    try:
        # Largest holders (up to 20)
        holders_data = _rpc_post({
            "jsonrpc": "2.0", "id": 1,
            "method": "getTokenLargestAccounts",
            "params": [token_mint, {"commitment": "finalized"}],
        })
        holders = holders_data.get("result", {}).get("value", [])
        if not holders:
            return True, "No holder data"

        # Total supply
        supply_data = _rpc_post({
            "jsonrpc": "2.0", "id": 2,
            "method": "getTokenSupply",
            "params": [token_mint],
        })
        supply_value = supply_data.get("result", {}).get("value", {})
        total_supply = float(supply_value.get("uiAmount") or 0)

        if total_supply <= 0:
            return True, "Supply unknown"

        top10_amount = sum(float(h.get("uiAmount") or 0) for h in holders[:10])
        concentration = (top10_amount / total_supply) * 100

        is_safe = concentration <= MAX_WHALE_PCT
        label = f"{concentration:.1f}% held by top 10"
        return is_safe, label

    except Exception as e:
        logger.warning(f"Whale check failed ({token_mint[:8]}...): {e}")
        return True, "Whale check unavailable"


# ── 5. Telegram alert ─────────────────────────────────────────────────────────
def send_alert(pair: dict, whale_info: str) -> None:
    base       = pair.get("baseToken", {})
    quote      = pair.get("quoteToken", {})
    name       = escape_md(base.get("name", "Unknown"))
    symbol     = escape_md(base.get("symbol", "???"))
    dex        = escape_md(pair.get("dexId", "").upper())
    pair_addr  = pair.get("pairAddress", "")
    mint       = base.get("address", "")

    vol        = pair.get("volume", {})
    price_usd  = float(pair.get("priceUsd") or 0)
    liq_usd    = float((pair.get("liquidity") or {}).get("usd") or 0)
    v5         = float(vol.get("m5") or 0)
    v1h        = float(vol.get("h1") or 0)
    price_ch   = pair.get("priceChange", {})
    ch5        = float(price_ch.get("m5") or 0)
    ch1h       = float(price_ch.get("h1") or 0)

    created_ms = pair.get("pairCreatedAt")
    age_str    = "Unknown"
    if created_ms:
        age_s  = (datetime.now(timezone.utc).timestamp() * 1000 - created_ms) / 1000
        age_str = f"{age_s/60:.0f}m ago" if age_s < 3600 else f"{age_s/3600:.1f}h ago"

    msg = (
        f"🚀 *SOLANA VOLUME SPIKE ALERT*\n\n"
        f"🪙 *{name}* \\(`{escape_md(symbol)}`\\)\n"
        f"🏦 DEX: `{dex}`\n"
        f"⏱ Listed: {escape_md(age_str)}\n\n"
        f"💵 Price: `${price_usd:.8g}`\n"
        f"📈 5m chg: `{ch5:+.1f}%` \\| 1h chg: `{ch1h:+.1f}%`\n"
        f"💧 Liquidity: `${liq_usd:,.0f}`\n"
        f"🔊 Vol 5m: `${v5:,.0f}` \\| Vol 1h: `${v1h:,.0f}`\n"
        f"🐳 Whale: {escape_md(whale_info)}\n\n"
        f"🔗 [DexScreener](https://dexscreener.com/solana/{pair_addr})\n"
        f"🔗 [Birdeye](https://birdeye.so/token/{mint})\n"
        f"🔗 [Solscan](https://solscan.io/token/{mint})"
    )

    try:
        bot.send_message(
            CHAT_ID, msg,
            parse_mode="MarkdownV2",
            disable_web_page_preview=True,
        )
        logger.info(f"Alert sent → {symbol} ({pair_addr[:8]}...)")
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")


# ── Main loop ─────────────────────────────────────────────────────────────────
def main() -> None:
    logger.info("🟢 Solana Sniper Bot starting…")
    try:
        ts = escape_md(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
        bot.send_message(
            CHAT_ID,
            f"✅ *Solana Sniper Bot online*\nStarted at {ts}",
            parse_mode="MarkdownV2",
        )
    except Exception as e:
        logger.warning(f"Startup message failed: {e}")

    last_heartbeat = datetime.now(timezone.utc)

    while True:
        now   = datetime.now(timezone.utc)
        pairs = fetch_solana_pairs()

        # Evict cooldown records older than 2 h
        stale = [k for k, v in seen_pairs.items() if (now - v) > timedelta(hours=2)]
        for k in stale:
            del seen_pairs[k]

        alerts_sent = 0

        for pair in pairs:
            pair_addr = pair.get("pairAddress")
            if not pair_addr:
                continue

            # Cooldown guard
            last_seen = seen_pairs.get(pair_addr)
            if last_seen and (now - last_seen) < timedelta(minutes=ALERT_COOLDOWN_MIN):
                continue

            # Filters
            liq = float((pair.get("liquidity") or {}).get("usd") or 0)
            if liq < MIN_LIQUIDITY_USD:
                continue
            if not is_fresh_pair(pair):
                continue
            if not volume_spike_detected(pair):
                continue

            # Whale check on base token mint
            mint = (pair.get("baseToken") or {}).get("address", "")
            is_safe, whale_info = check_whale_concentration(mint)
            if not is_safe:
                logger.info(f"Skipped {pair_addr[:8]} — whale concentration too high ({whale_info})")
                continue

            send_alert(pair, whale_info)
            seen_pairs[pair_addr] = now
            alerts_sent += 1
            time.sleep(0.5)  # rate-limit Telegram

        # Heartbeat
        if (now - last_heartbeat).total_seconds() >= HEARTBEAT_INTERVAL:
            try:
                bot.send_message(
                    CHAT_ID,
                    f"🫀 Bot alive \\| {len(pairs)} pairs scanned \\| "
                    f"{len(seen_pairs)} tracked",
                    parse_mode="MarkdownV2",
                )
                last_heartbeat = now
            except Exception as e:
                logger.warning(f"Heartbeat failed: {e}")

        logger.info(
            f"Cycle done — {len(pairs)} pairs checked, "
            f"{alerts_sent} alerts sent, sleeping {CHECK_INTERVAL_SEC}s"
        )
        time.sleep(CHECK_INTERVAL_SEC)


if __name__ == "__main__":
    main()
