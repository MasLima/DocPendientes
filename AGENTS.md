# AGENTS.md — Guía para Agentes de Desarrollo

## Project Overview

App de cobranza para vendedores. Consulta de documentos pendientes por cliente, registro de incidencias, envío de WhatsApp con artículos. Dos frontends (web + móvil) contra una API REST.

- **Server**: Windows Server 2022, XAMPP v3.3.0, Node.js v22.16.0, MySQL80
- **IP pública**: 190.12.91.41 (fija, sin dominio, sin SSL). Puerto 3000 forward en router.
- **IP interna**: 192.168.2.7
- **Project path**: `C:\OpenCode\DocPendientes\`
- **Mobile API URL**: `http://190.12.91.41:3000/api`

## DB Credentials

### Server (producción)
```
DB_USER=cobranza_app
DB_PASSWORD=TuaClaveSuperSegura2024!
DB_NAME=cobranza_app
DB_HOST=localhost
```
- Root MySQL CLI bloqueado (ERROR 1045). MySQL Workbench funciona.

### Local (desarrollo)
```
DB_USER=admin
DB_PASSWORD=adm.123
DB_NAME=cobranza_app
DB_HOST=localhost
JWT_SECRET=cobranza_secret_local_2024
JWT_EXPIRES=12h
```

## ERP (solo lectura)
```
dm.integrator.pe:3306
BD: db0010_01
User: coloma / Coloma#Integrator
```
- Conexiones Node.js desde IP local bloqueadas (ETIMEDOUT). Solo funciona en servidor.
- App VFP con MySQL ODBC 5.3 funciona localmente.

### ERP Tables
- `mplite001` (artículos, `ite_coin` = alternate code)
- `mplite003` (líneas), `mplite005` (unidades), `mplite011` (estados), `mplite014` (familias)
- `mlosto050` (stock), `mlosto040` (compras: `sto_cous` = unit cost, `sto_fere` = date)
- `mplven010` (prices: `ven_item`, `ven_cota`, `ven_pric`, `ven_pigv`)
- `mplter001` (clientes, `ter_tite='200000'`, `ter_fono` = landline, `ter_cell` = mobile)
- `mplter001 WHERE ter_tite = '300000'` (empleados/vendedores)

## Conventions

### CSS Variables (web styles.css)
- `--warning: #f5b041`, `--celeste: #85c1e9`
- `--grid-header`: light `#e8f5e9`, dark `#2a3a4a`
- `--active`: light `#d5e8d4`, dark `#2a3a4a`

### Button Conventions
- Register/Add/Save: `var(--celeste)` + white text + `height: 40`
- WhatsApp: `#25D366` + white
- Cancel: `#fde9ec` bg / `#c0392b` text

### FiltroPopup Pattern
- Modal with search, FlatList
- `requerirTelefono` prop: items without phone grayed out (opacity 0.4)
- Chips show name + phone

### Precios Config
- Codes: `('101', '102', '106')`
- Labels: `101`=02 PIEZAS 10 (S/), `102`=03 SELLADO (S/), `106`=04 DOLARES (US$)
- Synced with 4 decimals, displayed with 3 decimals

### Incidencias Sync
- **Solo ERP → App**: Las incidencias se sincronizan UNIDIRECCIONALMENTE desde el ERP
- **NO se sincronizan de App → ERP** (la función está desactivada en el orquestador)
- **Flujo**: Vendedor registra incidencia en la app → queda local → se ve en web/app
- **Tabla `sincronizada`**: Solo para referencia, NO se usa para envío al ERP
- **Todas las incidencias** (ERP + app/web) se muestran en la interfaz
- **Incluida en tarea programada** (1:00 AM) y sincronización manual

## Deploy Process

### Manual Deploy (current)
1. Copy modified files only to server via RDP
2. `pm2 restart cobranza-api`
3. Execute SQL migrations in MySQL Workbench if needed

### Files to Copy When Changed
- `api/src/*.js` — API routes and services
- `web/dist/` — Frontend build
- `apk/` — APK files for download

## Building APK (Local)

### Prerequisites
1. JDK 17: `C:\Program Files\Zulu\zulu-17`
2. Android SDK: `C:\Android\Sdk`
   - cmdline-tools, platforms;android-36, build-tools;36.0.0, ndk;27.1.12297006, cmake;3.22.1
3. Environment variables:
   ```
   JAVA_HOME=C:\Program Files\Zulu\zulu-17
   ANDROID_HOME=C:\Android\Sdk
   Path += C:\Android\Sdk\platform-tools;C:\Android\Sdk\cmdline-tools\latest\bin
   ```

### Build Steps
```powershell
# 1. Prebuild (genera carpeta android/)
cd C:\OpenCode\DocPendientes\movil
npx expo prebuild --platform android --clean

# 2. Build APK (solo arm64-v8a, ~24 min)
cd android
.\gradlew.bat assembleRelease --no-daemon --rerun-tasks

# 3. El APK queda en:
# android\app\build\outputs\apk\release\app-release.apk

# 4. Copiar para descarga:
Copy-Item "android\app\build\outputs\apk\release\app-release.apk" "..\..\apk\Cobranza-v1.0.0.apk"
```

### Build Config (android/app/build.gradle)
- `minSdkVersion 24` (Android 7.0+)
- `targetSdkVersion 36`
- `applicationId com.docpendientes.cobranza`
- `ndk { abiFilters 'arm64-v8a' }` (solo ARM64)
- Signing: debug keystore (para pruebas)

### gradle.properties optimizations
```
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
reactNativeArchitectures=arm64-v8a
```

## APK Download from Server

### API Route
- `GET /api/download/apk` — sin autenticación
- Sirve el primer .apk de la carpeta `apk/`
- Headers: `Content-Disposition: attachment`, `Content-Type: application/vnd.android.package-archive`

### Setup on Server
```powershell
# Copiar APK al servidor
Copy-Item "C:\OpenCode\DocPendientes\apk" "\\190.12.91.41\C$\OpenCode\DocPendientes\apk" -Recurse -Force

# Copiar app.js actualizado
Copy-Item "C:\OpenCode\DocPendientes\api\src\app.js" "\\190.12.91.41\C$\OpenCode\DocPendientes\api\src\app.js" -Force

# Reiniciar API
# En servidor: pm2 restart cobranza-api
```

### Download URL
```
http://190.12.91.41:3000/api/download/apk
```

## Scheduled Sync (Server)

Task Scheduler task "Cobranza Sync" runs daily at 1:00 AM:
```powershell
# Create task (run on server once):
powershell -ExecutionPolicy Bypass -File C:\OpenCode\DocPendientes\create-sync-task.ps1

# Or manually:
schtasks /create /tn "Cobranza Sync" /tr "cmd /c cd /d C:\OpenCode\DocPendientes\api && node src/sync.js >> sync.log 2>&1" /sc daily /st 01:00 /ru SYSTEM

# Verify: Get-ScheduledTask -TaskName "Cobranza Sync"
# Run now: Start-ScheduledTask -TaskName "Cobranza Sync"
```

## Important Notes

### pm2 Startup on Windows
- `pm2 startup` does NOT work on Windows
- Use `schtasks` with `pm2 resurrect` instead

### EAS Build
- Account: `masexp` / `mas-exp` (Owner)
- Free plan limit reached — builds unavailable until Oct 1, 2026
- Use local build instead (see Building APK section)

### Local Android SDK
- Installed at `C:\Android\Sdk`
- JDK 17 at `C:\Program Files\Zulu\zulu-17`
- Licenses accepted
