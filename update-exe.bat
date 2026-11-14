@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Kip — build ^& update exe
echo.
echo  ========================================
echo   Kip update build
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js pai nai. Age Node install koro.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm pai nai.
  pause
  exit /b 1
)

echo [1/4] Running Kip bandhocchi...
taskkill /IM Kip.exe /F >nul 2>&1
taskkill /IM electron.exe /F >nul 2>&1
timeout /t 1 /nobreak >nul

if not exist "node_modules\" (
  echo [2/4] node_modules nai — npm install cholche...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install fail.
    pause
    exit /b 1
  )
) else (
  echo [2/4] Dependencies ready.
)

echo [3/4] Fresh build + Windows installer banacche...
call npm run dist
if errorlevel 1 (
  echo.
  echo [ERROR] Build fail. Uporer log check koro.
  pause
  exit /b 1
)

echo [4/4] Installer launch hocche...
echo.

set "SETUP="
for %%F in ("release\Kip-*-Setup.exe") do set "SETUP=%%~fF"

if not defined SETUP (
  echo [WARN] Setup exe release\ folder e pai nai.
  explorer "%~dp0release"
  pause
  exit /b 1
)

echo  Built: %SETUP%
echo.
start "" "%SETUP%"
explorer /select,"%SETUP%"
echo Done. Installer window asbe — Next/Install chase.
echo.
pause
endlocal
