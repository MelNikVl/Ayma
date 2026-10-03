# Локальный запуск AYMA на Windows через Docker Desktop.
# Запуск: powershell -ExecutionPolicy Bypass -File .\start.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== AYMA: локальный запуск ==" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker не найден. Установите Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
    exit 1
}

# Ждём, пока поднимется Docker Engine (стартуем Docker Desktop при необходимости)
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Запускаю Docker Desktop..."
    $dd = "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dd) { Start-Process $dd }
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 3
        docker info *> $null
        if ($LASTEXITCODE -eq 0) { break }
    }
    if ($LASTEXITCODE -ne 0) { Write-Host "Docker Engine не запустился за 3 минуты." -ForegroundColor Red; exit 1 }
}

# .env для локального превью: случайный секрет, dev-вход, автопубликация
if (-not (Test-Path ".env")) {
    $chars = [char[]]((48..57) + (65..90) + (97..122))
    $secret = -join (1..48 | ForEach-Object { $chars | Get-Random })
    $text = [IO.File]::ReadAllText("$PSScriptRoot\.env.example", [Text.Encoding]::UTF8)
    $text = $text -replace 'SESSION_SECRET="[^"]*"', "SESSION_SECRET=`"$secret`""
    $text = $text -replace 'ENABLE_DEV_LOGIN="false"', 'ENABLE_DEV_LOGIN="true"'
    $text = $text -replace 'DEV_LOGIN_ALLOW_PRODUCTION="false"', 'DEV_LOGIN_ALLOW_PRODUCTION="true"'
    $text = $text -replace 'AUTO_APPROVE="false"', 'AUTO_APPROVE="true"'
    [IO.File]::WriteAllText("$PSScriptRoot\.env", $text, (New-Object Text.UTF8Encoding $false))
    Write-Host "Создан .env (dev-вход включён — только для локального превью)"
}

Write-Host "Сборка и запуск контейнеров (первый раз 3-7 минут)..."
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { Write-Host "docker compose завершился с ошибкой" -ForegroundColor Red; exit 1 }

$port = if ($Env:APP_PORT) { $Env:APP_PORT } else { "3000" }
$url = "http://localhost:$port"
Write-Host "Жду ответа приложения на $url ..."
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 "$url/api/health"
        if ($r.StatusCode -eq 200) { break }
    } catch { Start-Sleep -Seconds 2 }
}

Write-Host ""
Write-Host "Готово: $url" -ForegroundColor Green
Write-Host "Вход без Telegram: $url/login -> кнопка 'Войти без Telegram' (галочка 'администратор' даёт доступ к модерации)"
Write-Host "Остановить: docker compose down   |   Логи: docker compose logs -f app"
Start-Process "$url"
