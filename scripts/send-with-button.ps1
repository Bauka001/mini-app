# Set encoding to UTF-8 for console input/output to prevent character issues
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

$BOT_TOKEN = "8073638759:AAFFo7S5omP506H6_FrkxjN2xiTi-mDR98c"
$CHAT_ID = "-1003495648526"
$PLAY_URL = "https://mini-app-two-lyart.vercel.app"

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
• Акция уақыты дұрысталды (2026-04-16)
• Время акции исправлено (2026-04-16)

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
