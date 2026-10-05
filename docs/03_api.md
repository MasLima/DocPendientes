# 03 — API REST

Backend en Node.js/Express que sirve los datos a la app móvil y web.

## Levantar la API

```powershell
cd C:\OpenCode\DocPendientes\api
npm install        # solo la primera vez
npm run seed       # crea el usuario de prueba (primera vez)
npm start          # arranca en http://localhost:3000
```

El `.env` ya está configurado (ver `02_sync_erp.md`).

## Usuario de prueba

`npm run seed` crea/actualiza el usuario:

```
login: vendedor01
clave: 123456
```

El seed asigna automáticamente el vendedor con **más saldo pendiente**
(o el indicado con `SEED_TER_COTE=3000XX`).

## Autenticación

Todas las rutas (excepto las públicas de abajo) exigen el header:

```
Authorization: Bearer <token>
```

Públicas (sin token): `/api/auth/login`, `/api/health`, `/api/version`,
`/api/download/apk` y los archivos estáticos de `web/dist`.

El token se obtiene en el login y dura 12 horas (configurable en `.env`).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Body `{ use_logi, use_pass }` → `{ token, usuario }` |
| GET | `/api/health` | Estado de la API y la BD |
| GET | `/api/version` | Versión del APK disponible (la consulta el actualizador) |
| GET | `/api/download/apk` | Descarga el APK más reciente de `apk/` |
| GET | `/api/clientes` | Clientes del vendedor; `?todos=1` (permisos `incidencias.todas`/`clientes.ver_todos`), `?cliente=` |
| GET | `/api/clientes/vendedores` | Vendedores del ERP |
| GET | `/api/clientes/tipos-documento` | Catálogo de tipos de documento |
| GET | `/api/clientes/resumen` | Resumen de saldos por moneda |
| GET | `/api/clientes/vencimientos` | Documentos vencidos (`?cliente=`) para la pestaña Vencimientos |
| GET | `/api/clientes/:codigo` | Detalle: datos + resumen saldos + documentos |
| GET | `/api/documentos` | Pendientes con filtros `?cliente=&vencido=1&moneda=` |
| GET | `/api/incidencias` | Incidencias (`?todos=1` requiere permiso) |
| GET | `/api/incidencias/frecuencia` | Frecuencia de visitas por cliente |
| GET | `/api/incidencias/cliente/:codigo` | Incidencias de un cliente |
| GET | `/api/incidencias/:id` | Incidencia + detalle |
| POST | `/api/incidencias` | Body `{ ter_cote, inc_desc, inc_acci }` |
| PUT | `/api/incidencias/:codi` | Editar incidencia local (permiso `incidencias.editar`) |
| POST/GET | `/api/incidencias/:codi/audio` | Nota de voz (subir / obtener) |
| GET | `/api/reportes/saldos-por-cliente` | Resumen por cliente (con vencidos) |
| GET | `/api/reportes/saldos-por-vendedor` | Resumen global |
| GET | `/api/dashboard/saldos-por-vendedor` | Saldos por vendedor |
| GET | `/api/dashboard/top-clientes` | Top 10 deudores |
| GET | `/api/dashboard/documentos-antiguedad` | Docs por antigüedad de vencimiento |
| GET | `/api/dashboard/documentos-totales` | Totales por moneda |
| GET | `/api/dashboard/incidencias-resumen` | Resumen de incidencias |
| GET | `/api/usuarios` … | CRUD usuarios (`config.usuarios`) |
| GET | `/api/perfiles` / PUT `/api/perfiles/:rol` | Catálogo y asignación de permisos por rol |
| POST | `/api/sync/ejecutar` | Sync manual (`sync.ejecutar`); body `{ procesos, modo }` |
| GET | `/api/sync/log` / `/api/sync/estado` | Historial y estado del sync (`sync.ver_log`) |
| GET | `/api/articulos` (`/lineas`, `/familias`, `/imagen/:nombre`, `/:codigo`) | Catálogo de artículos |
| GET | `/api/whatsapp/estado` | Estado de la conexión WhatsApp |
| GET | `/api/whatsapp/qr` | QR actual (si `estado = esperando_qr`) |
| POST | `/api/whatsapp/conectar` / `/api/desconectar` | Reconectar / desconectar (destruye la sesión) |
| GET | `/api/whatsapp/contactos` (`?q=`) | Contactos de la sesión |
| GET | `/api/whatsapp/empleados` | Vendedores del ERP (para elegir remitente) |
| POST | `/api/whatsapp/enviar-texto` | Envío simple |
| POST | `/api/whatsapp/enviar-articulo` | Envío de artículo con imagen |
| POST | `/api/whatsapp/enviar-archivo` / `enviar-mixto` | Archivos / mixto (texto + imagen + archivos) |
| POST | `/api/whatsapp/upload` / GET `/api/whatsapp/archivos` | Subir y listar archivos |
| GET | `/api/whatsapp/historial` | Historial de envíos (filtros y paginación) |
| POST | `/api/whatsapp/enviar-vencimiento` | Envío por cliente de la pestaña Vencimientos; body admite `mensaje` (texto editado que reemplaza el template) |
| GET | `/api/config/vencimientos` | Rangos de vencimiento (`vencimientos.config`) |
| POST/PUT/DELETE | `/api/config/vencimientos[/:id]` | CRUD de rangos (`vencimientos.config`) |

## WhatsApp: conexión y reconexión

- Arquitectura **singleton**: un solo `Client` de whatsapp-web.js (un Chromium,
  un número). Sesión persistida en `api/whatsapp-session/` (LocalAuth).
- **Reconexión automática**: tras `disconnected`, fallo de inicialización o dos
  fallos de autenticación seguidos, se reintenta con backoff
  2s → 5s → 10s → 20s → 40s → 60s. Si WhatsApp cerró la sesión, se limpia y se
  genera un **QR nuevo** en la pantalla de WhatsApp (la web lo consulta cada 5s).
- Estados: `desconectado`, `iniciando`, `reconectando`, `esperando_qr`,
  `autenticado`, `conectado`, `error`. La UI muestra un punto ámbar durante
  `iniciando`/`reconectando`.
- Los **envíos esperan la reconexión**: hasta 15s (`asegurarConexion`) y 20s en
  `/enviar-vencimiento`; si se requiere escanear el QR falla rápido con
  `WhatsApp requiere escanear el QR`.
- `POST /desconectar` es una desconexión **manual**: ya no la revierte el
  polling de estado (hay que volver a `/conectar`).

## Ejemplos (PowerShell)

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" `
  -ContentType "application/json" -Body '{"use_logi":"vendedor01","use_pass":"123456"}'
$headers = @{ Authorization = "Bearer $($login.token)" }

# Clientes del vendedor
Invoke-RestMethod -Uri "http://localhost:3000/api/clientes" -Headers $headers

# Documentos pendientes vencidos en soles
Invoke-RestMethod -Uri "http://localhost:3000/api/documentos?vencido=1&moneda=PEN" -Headers $headers

# Detalle de cliente
Invoke-RestMethod -Uri "http://localhost:3000/api/clientes/104015" -Headers $headers

# Registrar incidencia
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/incidencias" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"ter_cote":"104015","inc_desc":"Visita de prueba","inc_acci":"Revisar el viernes"}'
```

## Respuesta típica de clientes

```json
[
  {
    "ter_cote": "101489",
    "ter_deno": "AB GRUPO EMPRESARIAL E.I.R.L.",
    "ter_rucn": "20536888617",
    "ter_fono": "SERGIO",
    "ter_cell": "923288612",
    "ter_emai": "schirinos@alebaigorria.com",
    "ter_cocp": "120",
    "ter_licr": 2500
  }
]
```

## Respuesta típica de detalle de cliente

```json
{
  "cliente": { "ter_cote": "104015", "ter_deno": "CONSORCIO ALTA MODA S.R.L.", "..." },
  "resumen": { "total_documentos": 3, "total_vencidos": 1, "saldo_PEN": 239.19 },
  "documentos": [
    {
      "cob_tivo": "V01",
      "cob_nuvo": "10189982",
      "cob_codo": "01",
      "cob_seri": "F001",
      "cob_nums": "66144",
      "fecha_emision": "2025-01-02",
      "fecha_vencimiento": "2025-01-17",
      "dias_vencido": 573,
      "cob_como": "PEN",
      "moneda_signo": "S/.",
      "estado_descripcion": "EMITIDO",
      "importe_original": 372.12,
      "pagado": 357.86,
      "saldo": 14.26
    }
  ]
}
```

## Estructura del backend

```
api\
├── .env                   credenciales y config
├── package.json           scripts: start, dev, seed, sync
├── seed.js                crea usuario de prueba
├── sync.js                sincroniza ERP -> BD app
└── src\
    ├── server.js          arranque
    ├── app.js             rutas + middlewares + /version + /download/apk
    ├── config\db.js       pool BD de la app (utf8mb4)
    ├── config\erp.js      pool ERP (solo lectura)
    ├── middleware\auth.js validacion JWT + permisos
    ├── middleware\permisos.js  requirePermiso(codigo)
    ├── services\syncService.js    sync vendedores/clientes/docs/incidencias
    ├── services\whatsappService.js  conexion WA + reconexion automatica
    ├── services\fileService.js    manejo de archivos subidos
    └── routes\            auth, usuarios, perfiles, clientes, documentos,
                           incidencias, reportes, dashboard, sync, articulos,
                           whatsapp, configVencimientos
```
