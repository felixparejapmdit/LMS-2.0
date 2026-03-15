$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$envPath = Join-Path $repoRoot '.env'
if (!(Test-Path $envPath)) {
    Write-Error ".env not found at $envPath"
    exit 1
}

$envLines = Get-Content $envPath
$tokenLine = $envLines | Where-Object { $_ -match '^TELEGRAM_BOT_TOKEN=' } | Select-Object -First 1
if (!$tokenLine) {
    Write-Error "TELEGRAM_BOT_TOKEN not set in .env"
    exit 1
}
$token = ($tokenLine -replace '^TELEGRAM_BOT_TOKEN=', '').Trim()

$logDir = Join-Path $repoRoot 'tmp'
New-Item -ItemType Directory -Force $logDir | Out-Null
$logFile = Join-Path $logDir 'localtunnel.log'
$errFile = Join-Path $logDir 'localtunnel.err'
$pidFile = Join-Path $logDir 'localtunnel.pid'
$urlFile = Join-Path $logDir 'localtunnel.url'
Remove-Item $logFile, $errFile, $pidFile, $urlFile -ErrorAction SilentlyContinue

$proc = Start-Process -FilePath "npx" -ArgumentList "-y localtunnel --port 5000 --local-host localhost --host https://loca.lt" -RedirectStandardOutput $logFile -RedirectStandardError $errFile -NoNewWindow -PassThru
$proc.Id | Set-Content $pidFile

$deadline = (Get-Date).AddSeconds(60)
$url = $null
while ((Get-Date) -lt $deadline -and -not $url) {
    if (Test-Path $logFile) {
        $match = Select-String -Path $logFile -Pattern 'your url is:' -SimpleMatch | Select-Object -Last 1
        if ($match) {
            $url = ($match.Line -replace 'your url is:\s*', '').Trim()
        }
    }
    Start-Sleep -Milliseconds 500
}

if (-not $url) {
    $errText = ''
    if (Test-Path $errFile) {
        $errText = (Get-Content $errFile -Raw).Trim()
    }
    if ([string]::IsNullOrWhiteSpace($errText)) {
        Write-Error "LocalTunnel URL not found. Check $logFile and $errFile"
    } else {
        Write-Error "LocalTunnel URL not found. Error output: $errText"
    }
    exit 1
}

$url | Set-Content $urlFile
$webhookUrl = "$url/api/telegram/webhook"

$updated = $false
$envLines = $envLines | ForEach-Object {
    if ($_ -match '^TELEGRAM_WEBHOOK_URL=') {
        $updated = $true
        "TELEGRAM_WEBHOOK_URL=$webhookUrl"
    } else {
        $_
    }
}
if (-not $updated) {
    $envLines += "TELEGRAM_WEBHOOK_URL=$webhookUrl"
}
Set-Content -Path $envPath -Value $envLines

$resp = & curl.exe -s --max-time 10 -F "url=$webhookUrl" "https://api.telegram.org/bot$token/setWebhook"
Write-Output $resp
Write-Output "Webhook set to $webhookUrl"
Write-Output "LocalTunnel PID: $($proc.Id)"
Write-Output "Keep this process running to keep the webhook alive."
