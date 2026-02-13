@echo off
setlocal

set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "PNPM_CLI=%APPDATA%\npm\node_modules\pnpm\bin\pnpm.cjs"
set "PATH=%ProgramFiles%\nodejs;%PATH%"

if not exist "%NODE_EXE%" (
  echo Node.js not found at "%NODE_EXE%".
  echo Install Node.js LTS first, then retry.
  exit /b 1
)

if not exist "%PNPM_CLI%" (
  echo pnpm CLI not found at "%PNPM_CLI%".
  echo Run: "%ProgramFiles%\nodejs\npm.cmd" install -g pnpm
  exit /b 1
)

"%NODE_EXE%" "%PNPM_CLI%" %*
exit /b %ERRORLEVEL%
