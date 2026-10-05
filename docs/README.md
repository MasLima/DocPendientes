# Cobranza Móvil — Documentación

Sistema de consulta de documentos pendientes por cliente y registro de
incidencias de visita. La **app (móvil + web)** lee información del **ERP**
(servidor remoto, solo lectura) y la guarda en una **base de datos propia**
que en producción estará en un servidor distinto al ERP.

## Arquitectura

```
+--------------------------+      solo LECTURA       +------------------+
|   ERP (MySQL/MariaDB)    | <---------------------- |   Sync (Node)    |
|   dm.integrator.pe       |   mplter001, mficob100, |   api/sync.js    |
|   db db0010_01           |   mficob200, mplgen006  |                  |
+--------------------------+                         +--------+---------+
                                                             | escribe
                                                             v
                              +---------------------+  +------------------+
                              |   BD de la app      |  |   API REST       |
                              |   cobranza_app      |<-|   Node/Express   |
                              |   (otro servidor    |  |   puerto 3000    |
                              |    en produccion)   |  +--------+---------+
                              +---------------------+           |
                                                                 | JSON + JWT
                                                                 v
                                         +---------------------+  +------+------+
                                         |  Web (Vite)         |  |  Movil      |
                                         |  localhost:3000     |  |  Expo Go    |
                                         +---------------------+  +-------------+
```

## Servidores y credenciales

| Recurso | Servidor | Base de datos | Usuario | Contraseña | Acceso |
|---|---|---|---|---|---|
| ERP (producción) | `dm.integrator.pe:3306` | `db0010_01` | `coloma` | `Coloma#Integrator` | **SOLO LECTURA** |
| BD de la app (pruebas) | `localhost:3306` | `cobranza_app` | `admin` | `adm.123` | Lectura/Escritura |
| BD de la app (producción) | *por definir* | `cobranza_app` | *por definir* | *por definir* | Lectura/Escritura |

> ⚠️ **Importante:** el usuario del ERP solo debe tener permisos `SELECT`.
> Nunca se escribe en la BD del ERP. Las incidencias se registran en la BD de
> la app y su envío al ERP queda como etapa futura (requiere un usuario con
> escritura en `mcoinci010`/`mcoinci020`).

## Perfiles de usuario

La app tiene **seis roles** con permisos distintos (ver tabla `permisos` y
`roles_permisos` en la BD, y [08_roles_permisos.md](08_roles_permisos.md)).
Cada rol ve un **menú lateral (drawer)** con las opciones que le corresponden
y los datos filtrados:

| Rol | Permisos | Menú visible | Alcance de datos |
|---|---|---|---|
| **admin** | 23 | Dashboard, Clientes, Reportes, Incidencias, Configuración, WhatsApp | Todos (ver_todos) |
| **gerencia** | 21 | Dashboard, Clientes, Reportes, Incidencias, Configuración, WhatsApp | Todos |
| **sistemas** | 21 | Dashboard, Clientes, Reportes, Incidencias, Configuración, WhatsApp | Todos |
| **empleado** | 14 | Dashboard, Clientes, Reportes, Incidencias, WhatsApp | Todos (ver_todos) |
| **vendedor** | 11 | Dashboard, Clientes, Reportes, Incidencias, WhatsApp | Solo los suyos (filtro por vendedor) |
| **contabilidad** | 8 | Dashboard, Clientes, Reportes, WhatsApp | Todos |

- **Dashboard**: saldos por vendedor, top clientes deudores, documentos por
  antigüedad de vencimiento, incidencias y frecuencia de visitas.
- **Configuración** (solo admin): **sincronización manual** (ejecutar en
  cualquier momento + historial de `sync_log`) y **gestión de usuarios**
  (crear/editar/desactivar). El vendedor debe existir en el ERP.
- **Incidencias**: historial + **frecuencia de visitas** por cliente (total,
  última visita, promedio de días, visitas últimos 30 días). Alta con o sin
  cliente (independiente). Las incidencias se **descargan del ERP**
  (`mcoinci010`/`mcoinci020`).

## Documentos de referencia

| Archivo | Contenido |
|---|---|
| [01_crear_bd.md](01_crear_bd.md) | Creación de la BD y tablas de la app paso a paso |
| [02_sync_erp.md](02_sync_erp.md) | Sincronización de vendedores, clientes y documentos desde el ERP |
| [03_api.md](03_api.md) | Configuración, endpoints y reconexión de WhatsApp |
| [04_pruebas.md](04_pruebas.md) | Pruebas en móvil y en web |
| [05_produccion.md](05_produccion.md) | Despliegue en producción |
| [06_ip_configuracion.md](06_ip_configuracion.md) | Configuración de la IP (automática y manual) |
| [07_despliegue.md](07_despliegue.md) | Despliegue automático con GitHub Actions |
| [08_roles_permisos.md](08_roles_permisos.md) | Roles, permisos, dashboard, sincronización y usuarios |
| [09_articulos_modulo.md](09_articulos_modulo.md) | Módulo de artículos (catálogo, precios, stock) |
| [10_whatsapp_multi_usuario_plan.md](10_whatsapp_multi_usuario_plan.md) | Plan futuro: WhatsApp multi-usuario (pool de sesiones) |
| [11_apk_build.md](11_apk_build.md) | Construcción del APK con Expo prebuild + Gradle |

## Estructura de carpetas

```
C:\OpenCode\DocPendientes\
├── docs\              <- esta documentación
├── sql\               <- scripts de creación de BD (referencia)
├── api\               <- backend: API REST + sync con el ERP
│   ├── src\config\db.js    pool BD de la app
│   ├── src\config\erp.js   pool ERP (solo lectura)
│   ├── src\middleware\     auth (JWT + permisos) y permisos (requirePermiso)
│   ├── src\routes\         auth, usuarios, perfiles, clientes, documentos,
│   │                       incidencias, reportes, dashboard, sync, articulos,
│   │                       whatsapp, configVencimientos
│   ├── src\services\       syncService (ERP → BD), whatsappService (conexión
│   │                       y reconexión automática), fileService
│   ├── sync.js             sincronizacion ERP -> BD app
│   ├── seed.js             crea usuarios de prueba (admin01/emplead01/vendedor01)
│   └── .env                credenciales y configuracion
├── web\                <- frontend web (Vite + React); build → web/dist
│   └── src\             screens y components (Vencimientos, WhatsApp, ...)
└── movil\              <- frontend: app Expo (Android y web Expo)
    └── src\
        ├── config.js       URL de la API (IP automática desde Metro)
        ├── api\client.js   llamadas HTTP + token
        ├── components\LogoutButton.js   botón de salir (web y móvil)
        ├── context\AuthContext.js
        └── screens\        Login, Dashboard, Clientes, ClienteDetalle,
                            Incidencias, NuevaIncidencia, Reportes, Configuracion
```
