# Set encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

$BOT_TOKEN = Read-Host "Bot Token"
$USERS_FILE = Read-Host "Users JSON file path"
$AIRDROP_CONFIG = @{
    totalUsers = 0
    minReward = 100
    maxReward = 5000
    totalBudget = 10000000
    currency = "coins"
}

Write-Host "Loading users from $USERS_FILE..." -ForegroundColor Cyan
$usersJson = Get-Content $USERS_FILE -Raw
$users = $usersJson | ConvertFrom-Json

Write-Host "Found $($users.Count) users" -ForegroundColor Green

$totalSent = 0
$totalFailed = 0
$errors = @()

foreach ($user in $users) {
    $reward = Get-Random -Minimum $AIRDROP_CONFIG.minReward -Maximum $AIRDROP_CONFIG.maxReward
    
    $message = @"
🎉 <b>АЙДРОП / AIRDROP</b> 🎉

👤 <b>Құттықтаймыз! / Поздравляем!</b>

💰 <b>Сізге сыйақы беріледі / Вам начислена награда:</b>
• $reward coins

🎮 <b>Ойынға кіріп алыңыз! / Зайдите в игру и заберите!</b>

#FocusGame #Airdrop
"@

    $uri = "https://api.telegram.org/bot$BOT_TOKEN/sendMessage"
    
    $escapedMessage = $message -replace '\\', '\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''
    
    $jsonBody = @"
{
    "chat_id": "$($user.id)",
    "text": "$escapedMessage",
    "parse_mode": "HTML"
}
"@

    try {
        $utf8 = [System.Text.Encoding]::UTF8
        $bytes = $utf8.GetBytes($jsonBody)
        
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $request = [System.Net.WebRequest]::Create($uri)
        $request.Method = "POST"
        $request.ContentType = "application/json; charset=utf-8"
        $request.ContentLength = $bytes.Length
        
        $stream = $request.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()
        
        $response = $request.GetResponse()
        $totalSent++
        
        Write-Host "✅ Sent to $($user.username): $reward coins" -ForegroundColor Green
        
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $responseContent = $reader.ReadToEnd()
        $reader.Close()
        $response.Close()
        
        Start-Sleep -Milliseconds 50
        
    } catch {
        $totalFailed++
        $errorMsg = "Failed for user $($user.id): $($_.Exception.Message)"
        $errors += $errorMsg
        Write-Host "❌ $errorMsg" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error details: $errorBody" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 Airdrop Statistics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Sent: $totalSent" -ForegroundColor Green
Write-Host "Total Failed: $totalFailed" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($totalSent / $users.Count) * 100, 2))%" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

if ($errors.Count -gt 0) {
    $errorFile = "airdrop-errors-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    $errors | Out-File -FilePath $errorFile -Encoding UTF8
    Write-Host "Errors saved to: $errorFile" -ForegroundColor Yellow
}
