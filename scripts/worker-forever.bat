@echo off
REM Mantiene el worker de WhatsApp encendido y lo reinicia si se cae.
REM Uso: doble clic o scripts\worker-forever.bat
cd /d "%~dp0.."

REM Los enlaces que recibe el cliente deben apuntar al panel publico.
if "%APP_URL%"=="" set "APP_URL=https://tropigo-ai.vercel.app"

:loop
echo.
echo ============================================
echo  TropiGO Worker - iniciando / reiniciando
echo ============================================
call npm run start:worker
echo.
echo El worker se detuvo. Reiniciando en 5 segundos...
timeout /t 5 /nobreak >nul
goto loop
