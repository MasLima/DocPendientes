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
                                        |  Web (Expo)         |  |  Movil      |
                                        |  localhost:8082     |  |  Expo Go    |
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

## Documentos de referencia

| Archivo | Contenido |
|---|---|
| [01_crear_bd.md](01_crear_bd.md) | Creación de la BD y tablas de la app paso a paso |
| [02_sync_erp.md](02_sync_erp.md) | Sincronización de maestros y documentos desde el ERP |
| [03_api.md](03_api.md) | Configuración y endpoints de la API |
| [04_pruebas.md](04_pruebas.md) | Pruebas en móvil y en web |
| [05_produccion.md](05_produccion.md) | Despliegue en producción |
| [06_ip_configuracion.md](06_ip_configuracion.md) | Configuración de la IP (automática y manual) |

## Estructura de carpetas

```
C:\OpenCode\DocPendientes\
├── docs\              <- esta documentación
├── sql\               <- scripts de creación de BD (referencia)
├── api\               <- backend: API REST + sync con el ERP
│   ├── src\config\db.js    pool BD de la app
│   ├── src\config\erp.js   pool ERP (solo lectura)
│   ├── src\routes\         auth, clientes, documentos, incidencias, reportes
│   ├── sync.js             sincronizacion ERP -> BD app
│   ├── seed.js             crea el usuario de prueba
│   └── .env                credenciales y configuracion
└── movil\              <- frontend: app Expo (móvil y web)
    └── src\
        ├── config.js       URL de la API (IP automática desde Metro)
        ├── api\client.js   llamadas HTTP + token
        ├── components\LogoutButton.js   botón de salir (web y móvil)
        ├── context\AuthContext.js
        └── screens\        Login, Clientes, ClienteDetalle, Incidencias, Reportes
```
