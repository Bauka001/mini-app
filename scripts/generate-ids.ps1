# Set encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

$COUNT = Read-Host "How many IDs to generate? (e.g. 1000000)"
if (-not $COUNT) { $COUNT = 1000000 }

$FILE_NAME = "generated_ids_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"

Write-Host "Generating $COUNT unique IDs..." -ForegroundColor Cyan

$ids = New-Object System.Collections.Generic.HashSet[string]
$random = New-Object System.Random

$startTime = Get-Date

while ($ids.Count -lt $COUNT) {
    # Generate 8-digit ID like 17096844
    $newId = $random.Next(10000000, 99999999).ToString()
    $null = $ids.Add($newId)
    
    if ($ids.Count % 100000 -eq 0) {
        Write-Host "Progress: $($ids.Count) IDs generated..." -ForegroundColor Yellow
    }
}

Write-Host "Saving to $FILE_NAME..." -ForegroundColor Cyan
$ids | Out-File -FilePath $FILE_NAME -Encoding UTF8

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "✅ Generation Complete!" -ForegroundColor Green
Write-Host "Total IDs: $($ids.Count)" -ForegroundColor White
Write-Host "File: $FILE_NAME" -ForegroundColor White
Write-Host "Time taken: $($duration.TotalSeconds) seconds" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
