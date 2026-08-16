# 05 — Despliegue en producción

En producción la BD de la app **estará en un servidor distinto al ERP**. La
API y el sync corren en el servidor de la app, que se conecta al ERP
**solo para leer**.

## Diagrama de producción

```
+------------------+          solo LECTURA            +------------------------+         +----------+
|  ERP remoto      | <-------------------------------- |  Servidor de la app    |   HTTP  |  Mobil   |
|  dm.integrator.pe|   sync.js (programado)           |  + API Express :3000   |<------- |  Expo Go |
+------------------+                                   |  + BD cobranza_app     |         +----------+
                                                       |  + BD local de la app  |  HTTP   +----------+
                                                       +------------------------+<------- |  Web/PC  |
```

## Pasos de despliegue

### 1. Servidor de la app

Requisitos:
- Node.js 22+ (LTS)
- MySQL/MariaDB para la BD `cobranza_app`
- Conexión de red saliente hacia `dm.integrator.pe:3306` habilitada

### 2. Copiar el proyecto

```powershell
# desde la maquina de desarrollo
robocopy C:\OpenCode\DocPendientes\api \\SERVIDOR_APP\cobranza\api /E
robocopy C:\OpenCode\DocPendientes\sql \\SERVIDOR_APP\cobranza\sql /E
```

> No copiar `node_modules`; ejecutar `npm install` en el servidor.

### 3. Crear la BD en el servidor de la app

```powershell
cmd /c "mysql -u <usuario> -p<clave> -h <host_app> < `"C:\cobranza\sql\00_crear_bd.sql`""
cmd /c "mysql -u <usuario> -p<clave> -h <host_app> < `"C:\cobranza\sql\04_usuarios_app.sql`""
```

### 4. Configurar `.env` en el servidor

```ini
PORT=3000
JWT_SECRET=<secreto-largo-aleatorio>

# BD de la app (en el servidor de la app)
DB_HOST=localhost
DB_PORT=3306
DB_USER=<usuario_app>
DB_PASSWORD=<clave_app>
DB_NAME=cobranza_app

# ERP - SOLO LECTURA (crear usuario de solo SELECT)
ERP_HOST=dm.integrator.pe
ERP_PORT=3306
ERP_USER=<usuario_solo_select>
ERP_PASSWORD="<clave>"
ERP_DB=db0010_01
```

> **Seguridad:** crear en el ERP un usuario dedicado con permisos únicamente
> `SELECT` sobre las tablas `mplter001`, `mtguse001`, `mficob100`, `mficob200`,
> `mplgen006`, `mplcom009`. Nunca usar una cuenta con escritura.

### 5. Instalar y arrancar

```powershell
cd C:\cobranza\api
npm install
npm run sync     # carga inicial de datos del ERP
npm run seed     # crea un usuario de prueba / o el definitivo
npm start        # API en :3000
```

### 6. Programar el sync

Con el **Programador de tareas de Windows** (diario, por ejemplo 06:00):

```powershell
schtasks /create /tn "Cobranza Sync" /tr "cmd /c cd /d C:\cobranza\api && npm run sync >> sync.log 2>&1" /sc daily /st 06:00 /ru SYSTEM
```

### 7. Publicar el frontend

La versión **web** se genera como estáticos y se sirve con cualquier
servidor web (IIS, nginx, etc.):

```powershell
cd C:\OpenCode\DocPendientes\movil
npx expo export --platform web
# el resultado queda en dist\ -> copiar al servidor web
```

Para el **móvil**, ajustar `IP_LAN` en `movil\src\config.js` a la IP pública o
el dominio del servidor y compilar APK/IPA (o seguir usando Expo Go en
entornos controlados).

## Checklist de producción

- [ ] Usuario del ERP con permisos SOLO de lectura (`SELECT`)
- [ ] JWT_SECRET cambiado (no usar el valor por defecto)
- [ ] Usuarios de la app reales creados (no dejar `vendedor01/123456`)
- [ ] Sync programado y verificado en `sync_log`
- [ ] Backups de la BD `cobranza_app`
- [ ] Firewall abierto solo en puerto 3000 (API) hacia los clientes
- [ ] HTTPS/dominio para la versión web