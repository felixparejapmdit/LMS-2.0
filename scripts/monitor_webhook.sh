#!/bin/bash

BOT_TOKEN="8781362705:AAFQBvGLew7atsF-RTXMIsMhXAKX4BGKONk"
CHECK_INTERVAL=300 

echo "--- Starting LMS 2.0 Webhook Monitor on Proxmox ---"

while true; do
    RESPONSE=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
    
    # I-check kung ang URL ay empty
    if [[ $RESPONSE == *'"url":""'* ]]; then
        echo "[$(date)] Webhook is EMPTY. Restarting setup..."
        
        # CORRECTED: Ginamit ang bash imbes na pwsh, at tinuro sa tamang .sh file
        bash ./setup_localtunnel.sh
    else
        echo "[$(date)] Webhook is LIVE."
    fi

    sleep $CHECK_INTERVAL
done