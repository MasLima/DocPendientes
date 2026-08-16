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

Todas las rutas (excepto `/auth/login` y `/health`) exigen el header:

```
Authorization: Bearer <token>
```

El token se obtiene en el login y dura 12 horas (configurable en `.env`).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Body `{ use_logi, use_pass }` → `{ token, usuario }` |
| GET | `/api/health` | Estado de la API y la BD |
| GET | `/api/clientes` | Clientes del vendedor autenticado |
| GET | `/api/clientes/:codigo` | Detalle: datos + resumen saldos + documentos |
| GET | `/api/documentos` | Pendientes con filtros `?cliente=&vencido=1&moneda=` |
| GET | `/api/incidencias` | Incidencias del vendedor |
| GET | `/api/incidencias/:id` | Incidencia + detalle |
| POST | `/api/incidencias` | Body `{ ter_cote, inc_desc, inc_acci }` |
| GET | `/api/reportes/saldos-por-cliente` | Resumen por cliente (con vencidos) |
| GET | `/api/reportes/saldos-por-vendedor` | Resumen global |

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
    ├── app.js             rutas + middlewares
    ├── config\db.js       pool BD de la app
    ├── config\erp.js      pool ERP (solo lectura)
    ├── middleware\auth.js validacion JWT
    └── routes\            auth, clientes, documentos, incidencias, reportes
```
