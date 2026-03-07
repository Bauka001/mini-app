Param(
  [string]$BotToken = $env:BOT_TOKEN,
  [string]$ChatId = $env:CHAT_ID,
  [string]$ShortName = "focus_game"
)

if (-not $BotToken) { Write-Error "BOT_TOKEN not set"; exit 1 }
if (-not $ChatId) { Write-Error "CHAT_ID not set"; exit 1 }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$json = (@{ chat_id = $ChatId; game_short_name = $ShortName } | ConvertTo-Json -Depth 4)
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
Invoke-RestMethod -Uri ("https://api.telegram.org/bot{0}/sendGame" -f $BotToken) -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes
