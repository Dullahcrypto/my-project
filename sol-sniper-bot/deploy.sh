#!/usr/bin/env bash
# Deploy Solana Sniper Bot to an Ubuntu/Debian VPS.
# Usage: bash deploy.sh [user@host]
# Requires: ssh, scp, rsync

set -euo pipefail

HOST="${1:-}"
REMOTE_DIR="/opt/sol-sniper-bot"
SERVICE="sol-sniper-bot"

if [[ -z "$HOST" ]]; then
  echo "Usage: $0 user@host"
  exit 1
fi

echo "==> Syncing files to $HOST:$REMOTE_DIR"
ssh "$HOST" "sudo mkdir -p $REMOTE_DIR && sudo chown \$USER:\$USER $REMOTE_DIR"
rsync -avz --exclude='.env' --exclude='__pycache__' --exclude='*.pyc' \
  sol_bot.py requirements.txt sol-sniper-bot.service \
  "$HOST:$REMOTE_DIR/"

echo "==> Installing Python dependencies"
ssh "$HOST" "
  cd $REMOTE_DIR
  python3 -m venv venv
  venv/bin/pip install --upgrade pip -q
  venv/bin/pip install -r requirements.txt -q
"

echo "==> Checking for .env on remote"
ssh "$HOST" "
  if [ ! -f $REMOTE_DIR/.env ]; then
    echo ''
    echo '  *** No .env found on remote. Copy yours with: ***'
    echo '  scp .env $HOST:$REMOTE_DIR/.env'
    echo ''
  fi
"

echo "==> Installing and enabling systemd service"
ssh "$HOST" "
  sudo cp $REMOTE_DIR/sol-sniper-bot.service /etc/systemd/system/$SERVICE.service
  sudo sed -i 's|User=ubuntu|User='\$USER'|' /etc/systemd/system/$SERVICE.service
  sudo systemctl daemon-reload
  sudo systemctl enable $SERVICE
  sudo systemctl restart $SERVICE
  sleep 2
  sudo systemctl status $SERVICE --no-pager
"

echo ""
echo "==> Done! Useful commands on the server:"
echo "  sudo journalctl -u $SERVICE -f          # live logs"
echo "  sudo systemctl restart $SERVICE          # restart bot"
echo "  sudo systemctl stop $SERVICE             # stop bot"
