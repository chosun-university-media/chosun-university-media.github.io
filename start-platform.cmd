@echo off
setlocal
title Chosun Media Platform Server

cd /d "%~dp0"

set "PLATFORM_URL=http://127.0.0.1:4180/index.html"
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "BUNDLED_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%BUNDLED_PYTHON%" set "PYTHON_EXE=%BUNDLED_PYTHON%"

echo.
echo Starting Chosun University Media Platform...
echo.
echo Keep this window open while using the platform.
echo Browser address:
echo %PLATFORM_URL%
echo.

for /f "tokens=5" %%P in ('netstat -ano ^| findstr "127.0.0.1:4180" ^| findstr "LISTENING"') do set "EXISTING_PID=%%P"
if defined EXISTING_PID (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-Process -Id %EXISTING_PID% -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -match 'node') { Write-Host 'Restarting existing platform server...'; Stop-Process -Id %EXISTING_PID% -Force; Start-Sleep -Seconds 1; exit 0 } exit 1"
  if errorlevel 1 (
    echo Port 4180 is already in use by another program. Please close it and run this file again.
    pause
    exit /b 1
  )
)

if "%NO_BROWSER%"=="1" goto RUN_SERVER
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%PLATFORM_URL%'"

:RUN_SERVER
if exist "%BUNDLED_NODE%" (
  "%BUNDLED_NODE%" server.js
) else (
  node server.js
)

echo.
echo Server stopped.
pause
