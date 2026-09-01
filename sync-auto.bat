@echo off
REM ============================================================
REM Sincronizacion automatica del sistema de Cobranza
REM Ejecuta sync completo (DELETE + INSERT) via API
REM Programado via Windows Task Scheduler (CobranzaSync)
REM ============================================================

set PATH=C:\Program Files\nodejs;C:\Users\Administrador\AppData\Roaming\npm;%PATH%
set PM2_HOME=C:\Users\Administrador\.pm2

REM Crear carpeta de logs si no existe
if not exist "C:\OpenCode\DocPendientes\logs" mkdir "C:\OpenCode\DocPendientes\logs"

REM Ejecutar sync completo via API (modo completo = DELETE + INSERT)
curl -s -X POST http://localhost:3000/api/sync/ejecutar -H "Content-Type: application/json" -d "{\"modo\":\"completo\"}" > nul 2>&1

REM Registrar en log
echo %date% %time% - Sync automatico ejecutado >> "C:\OpenCode\DocPendientes\logs\sync-auto.log"
