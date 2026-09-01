@echo off
set PATH=C:\Program Files\nodejs;C:\Users\Administrator\AppData\Roaming\npm;%PATH%
set APPDATA=C:\Users\Administrator\AppData\Roaming
:loop
cd /d C:\OpenCode\DocPendientes\movil
npx localtunnel --port 3000 --subdomain cobranza-docpendientes
timeout /t 5
goto loop
