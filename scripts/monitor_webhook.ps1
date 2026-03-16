# scripts\monitor_webhook.ps1
$BOT_TOKEN = "8781362705:AAFQBvGLew7atsF-RTXMIsMhXAKX4BGKONk"
$CHECK_INTERVAL = 300 # Bawat 5 minuto (sa seconds)

Write-Host "--- Starting LMS 2.0 Webhook Monitor ---" -ForegroundColor Cyan

while ($true) {
    try {
        # 1. Kunin ang current webhook info mula sa Telegram
        $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
        $currentUrl = $response.result.url

        if ([string]::IsNullOrWhiteSpace($currentUrl)) {
            Write-Host "[$(Get-Date)] Webhook is EMPTY. Restarting..." -ForegroundColor Yellow
            powershell -ExecutionPolicy Bypass -File "scripts\setup_localtunnel_webhook.ps1"
        } else {
            # 2. I-test kung accessible pa ang URL
            $testRequest = Invoke-WebRequest -Uri $currentUrl -Method Head -ErrorAction SilentlyContinue
            Write-Host "[$(Get-Date)] Webhook OK: $currentUrl" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "[$(Get-Date)] Webhook DOWN or EXPIRED. Re-running setup..." -ForegroundColor Red
        # 3. I-run ang setup script mo kapag nag-fail ang request
        powershell -ExecutionPolicy Bypass -File "scripts\setup_localtunnel_webhook.ps1"
    }

    Start-Sleep -Seconds $CHECK_INTERVAL
}