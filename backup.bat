@echo off
setlocal

:: Use PowerShell to get timestamp
for /f "tokens=*" %%i in ('powershell -Command "Get-Date -Format 'yyyyMMdd_HHmm'"') do set ts=%%i

set "backupDir=history_backups\v_%ts%"

if not exist "history_backups" mkdir "history_backups"
if not exist "%backupDir%" mkdir "%backupDir%"

copy index.html "%backupDir%" >nul
copy app.js "%backupDir%" >nul
copy style.css "%backupDir%" >nul
copy GAS_Script.gs "%backupDir%" >nul

echo Backup created at %backupDir%
pause
