# Set encoding to UTF-8 for console input/output to prevent character issues
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

$BOT_TOKEN = $env:BOT_TOKEN
if (-not $BOT_TOKEN -or $BOT_TOKEN.Trim().Length -eq 0) {
  $BOT_TOKEN = Read-Host "Enter BOT_TOKEN"
}
$CHAT_ID = $env:CHAT_ID
if (-not $CHAT_ID -or $CHAT_ID.Trim().Length -eq 0) {
  $CHAT_ID = Read-Host "Enter CHAT_ID"
}
$PLAY_URL = $env:PLAY_URL
if (-not $PLAY_URL -or $PLAY_URL.Trim().Length -eq 0) {
  $PLAY_URL = "https://mini-app-two-lyart.vercel.app"
}

$message = @"
🔔 <b>ЖАҢАРТУ / ОБНОВЛЕНИЕ</b> 🔔

🛠 <b>Техникалық жұмыстар аяқталды / Технические работы завершены</b>

⚡ <b>Оңтайландыру / Оптимизация:</b>
• Жүйе жұмысы жылдамдатылды
• Работа системы ускорена

🧹 <b>Тазарту / Очистка:</b>
• Артық файлдар жойылды
• Лишние файлы удалены

🐛 <b>Түзетулер / Исправления:</b>
• Акция уақыты ұзартылды (2026-04-26)
• Время акции продлено (2026-04-26)

🎮 <b>Ойынға кіріп тексеріңіз! / Зайдите в игру и проверьте!</b>

#FocusGame #Update #Optimization
"@

# Manually construct the JSON for the keyboard to avoid PowerShell array flattening issues
$replyMarkupJson = @"
{
    "inline_keyboard": [
        [
            {
                "text": "🎮 ИГРАТЬ / ОЙНАУ",
                "url": "$PLAY_URL"
            }
        ]
    ]
}
"@

$uri = "https://api.telegram.org/bot$BOT_TOKEN/sendMessage"

# Construct the main JSON body manually to be absolutely safe about structure and encoding
$escapedMessage = $message -replace '\\', '\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''

$jsonBody = @"
{
    "chat_id": "$CHAT_ID",
    "text": "$escapedMessage",
    "parse_mode": "HTML",
    "disable_web_page_preview": false,
    "reply_markup": $replyMarkupJson
}
"@

# Force UTF-8 bytes for the body
$utf8 = [System.Text.Encoding]::UTF8
$bytes = $utf8.GetBytes($jsonBody)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

try {
    $request = [System.Net.WebRequest]::Create($uri)
    $request.Method = "POST"
    $request.ContentType = "application/json; charset=utf-8"
    $request.ContentLength = $bytes.Length
    
    $stream = $request.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    
    $response = $request.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $responseContent = $reader.ReadToEnd()
    
    Write-Host "✅ Хабарлама сәтті жіберілді! / Сообщение успешно отправлено!" -ForegroundColor Green
    Write-Host "Response: $responseContent"
    Write-Host "Button: ИГРАТЬ / ОЙНАУ"
    Write-Host "URL: $PLAY_URL"

} catch {
    Write-Host "❌ Қате орын алды! / Произошла ошибка!" -ForegroundColor Red
    Write-Host "Exception: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}
