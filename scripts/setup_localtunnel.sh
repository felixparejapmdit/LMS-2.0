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
LOG_FILE="$TMP_DIR/ngrok.log"
PID_FILE="$TMP_DIR/ngrok.pid"
URL_FILE="$TMP_DIR/ngrok.url"

# Patayin ang lumang ngrok kung meron man
if pgrep -x "ngrok" > /dev/null; then
    echo "Killing existing ngrok process..."
    pkill -x "ngrok"
    rm "$PID_FILE" "$LOG_FILE" "$URL_FILE" 2>/dev/null
fi

# 4. Start Ngrok
# Gagamit tayo ng port 5000 para sa iyong Backend
echo "Starting Ngrok tunnel on port 5000..."
ngrok http 5000 --log=stdout > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# 5. Wait for URL (Ngrok API check)
echo -n "Waiting for Ngrok URL"
URL=""
COUNTER=0
MAX_RETRIES=15 

# Mas mabilis at accurate kunin ang URL via Ngrok local API kaysa sa logs
while [ -z "$URL" ] && [ $COUNTER -lt $MAX_RETRIES ]; do
    sleep 2
    URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.[a-z]*' | head -n 1)
    ((COUNTER++))
    echo -n "."
done
echo ""

if [ -z "$URL" ]; then
    echo "Error: Ngrok URL not found. Check if ngrok is authenticated."
    exit 1
fi

echo "$URL" > "$URL_FILE"
WEBHOOK_URL="$URL/api/telegram/webhook"

# 6. Update .env file
if grep -q '^TELEGRAM_WEBHOOK_URL=' "$ENV_PATH"; then
    sed -i "s|^TELEGRAM_WEBHOOK_URL=.*|TELEGRAM_WEBHOOK_URL=$WEBHOOK_URL|" "$ENV_PATH"
else
    echo "TELEGRAM_WEBHOOK_URL=$WEBHOOK_URL" >> "$ENV_PATH"
fi

# 7. Set Telegram Webhook via Curl
echo "Setting Webhook to: $WEBHOOK_URL"
RESP=$(curl -s -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" -F "url=$WEBHOOK_URL")

echo "Response: $RESP"
echo "Webhook successfully set via Ngrok!"
echo "Ngrok PID: $(cat $PID_FILE)"