Param(
  [string]$BotToken = $env:BOT_TOKEN,
  [string]$AppUrl = $env:APP_URL,
  [string]$Text = "PLAY",
  [string]$ChatId = ""
)

if (-not $BotToken) { Write-Error "BOT_TOKEN not set"; exit 1 }
if (-not $AppUrl) { Write-Error "APP_URL not set"; exit 1 }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$payload = @{ menu_button = @{ type = 'web_app'; text = $Text; web_app = @{ url = $AppUrl } } }
if ($ChatId) { $payload.chat_id = $ChatId }

$json = $payload | ConvertTo-Json -Depth 6
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
Invoke-RestMethod -Uri ("https://api.telegram.org/bot{0}/setChatMenuButton" -f $BotToken) -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes
