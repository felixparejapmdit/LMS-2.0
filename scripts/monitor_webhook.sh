#!/bin/bash

BOT_TOKEN="8781362705:AAFQBvGLew7atsF-RTXMIsMhXAKX4BGKONk"
CHECK_INTERVAL=300 # 5 minutes

echo "--- Starting LMS 2.0 Webhook Monitor on Proxmox ---"

while true; do
    # 1. Kunin ang current webhook info
    RESPONSE=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
    CURRENT_URL=$(echo $RESPONSE | grep -oP '(?<="url":")[^"]*')

    # 2. I-check kung empty o kung nag-e-error (HTTP 200 check)
    if [ -z "$CURRENT_URL" ] || ! curl -s --head --request GET "$CURRENT_URL" | grep "200 OK" > /dev/null; then
        echo "[$(date)] Webhook is DOWN or EMPTY. Restarting setup..."
        # Palitan ito ng actual command na nagpapatakbo ng tunnel mo sa Linux
        # Halimbawa: lt --port 8055
        /root/scripts/setup_localtunnel.sh 
    else
        echo "[$(date)] Webhook OK: $CURRENT_URL"
    fi

    sleep $CHECK_INTERVAL
done