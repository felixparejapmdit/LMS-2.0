#!/bin/bash

# Configuration
REPO_ROOT="$(dirname "$(readlink -f "$0")")/.."
ENV_PATH="$REPO_ROOT/.env"
TMP_DIR="$REPO_ROOT/tmp"

# 1. Check if .env exists
if [ ! -f "$ENV_PATH" ]; then
    echo "Error: .env not found at $ENV_PATH"
    exit 1
fi

# 2. Get Telegram Token from .env
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$ENV_PATH" | cut -d '=' -f2- | tr -d '\r' | xargs)
if [ -z "$TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN not set in .env"
    exit 1
fi

# 3. Setup Temp Directory
mkdir -p "$TMP_DIR"
LOG_FILE="$TMP_DIR/localtunnel.log"
PID_FILE="$TMP_DIR/localtunnel.pid"
URL_FILE="$TMP_DIR/localtunnel.url"

# Patayin ang lumang localtunnel kung meron man
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    kill $OLD_PID 2>/dev/null
    rm "$PID_FILE" "$LOG_FILE" "$URL_FILE" 2>/dev/null
fi

# 4. Start LocalTunnel
# Note: Binago ko ang port sa 8055 para mag-match sa Directus mo sa Proxmox
echo "Starting LocalTunnel on port 8055..."
npx -y localtunnel --port 8055 --host https://loca.lt > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# 5. Wait for URL
URL=""
COUNTER=0
MAX_RETRIES=30 # 30 seconds max wait

while [ -z "$URL" ] && [ $COUNTER -lt $MAX_RETRIES ]; do
    sleep 2
    URL=$(grep -o 'https://[^ ]*loca.lt' "$LOG_FILE" | head -n 1)
    ((COUNTER++))
    echo -n "."
done
echo ""

if [ -z "$URL" ]; then
    echo "Error: LocalTunnel URL not found. Check $LOG_FILE"
    exit 1
fi

echo "$URL" > "$URL_FILE"
WEBHOOK_URL="$URL/api/telegram/webhook"

# 6. Update .env file
if grep -q '^TELEGRAM_WEBHOOK_URL=' "$ENV_PATH"; then
    # Update existing line
    sed -i "s|^TELEGRAM_WEBHOOK_URL=.*|TELEGRAM_WEBHOOK_URL=$WEBHOOK_URL|" "$ENV_PATH"
else
    # Append new line
    echo "TELEGRAM_WEBHOOK_URL=$WEBHOOK_URL" >> "$ENV_PATH"
fi

# 7. Set Telegram Webhook via Curl
echo "Setting Webhook to: $WEBHOOK_URL"
RESP=$(curl -s -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" -F "url=$WEBHOOK_URL")

echo "Response: $RESP"
echo "Webhook successfully set!"
echo "LocalTunnel PID: $(cat $PID_FILE)"