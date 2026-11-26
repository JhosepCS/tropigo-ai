@echo off
REM Mantiene el worker de WhatsApp encendido y lo reinicia si se cae.
REM Uso: doble clic o scripts\worker-forever.bat
cd /d "%~dp0.."

REM Los enlaces que recibe el cliente deben apuntar al panel publico.
if "%APP_URL%"=="" set "APP_URL=https://tropigo-ai.vercel.app"

REM Evita abrir una segunda instancia (provoca conflicto de sesion 440).
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/health' -TimeoutSec 3 -UseBasicParsing; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel%==0 (
  echo Ya hay un worker activo en este equipo. No se inicia otro.
  timeout /t 5 /nobreak >nul
  exit /b 0
)

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
