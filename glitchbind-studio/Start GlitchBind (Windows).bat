@echo off
rem Double-click this file to start GlitchBind Studio on Windows.
cd /d "%~dp0"
title GlitchBind Studio
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  GlitchBind Studio needs Node.js, which is not installed yet.
  echo  1. Go to https://nodejs.org and install the version marked LTS.
  echo  2. Then double-click this file again.
  echo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo  First start: setting things up. This takes a minute or two and needs the internet once...
  call npm install
  if errorlevel 1 (
    echo.
    echo  Setup did not finish. Check your internet connection and double-click this file again.
    pause
    exit /b 1
  )
)
echo.
echo  Starting GlitchBind Studio. Your browser will open by itself.
echo  Keep this window open while you work. Close it to stop the app.
echo.
call npm start
pause
