@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo Python is not installed or is not available in PATH.
    pause
    exit /b 1
)

start "JPD123 Server" /min python server.py
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000"

endlocal
