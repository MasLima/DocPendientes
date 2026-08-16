# DocPendientes — App de Cobranza

Consulta de **documentos pendientes por cliente** y **registro de
incidencias de visita**, con dos frontends contra la misma API:

- **`movil/`** — App **Expo (React Native)** para **vendedores en campo** (Expo Go).
- **`web/`** — Frontend **web (Vite + React)** para **empleados/administradores**
  (gestión) y también para **vendedores** que hagan actividades de escritorio.

## Lectura rápida

| Necesitas | Ve a |
|---|---|
| Entender la arquitectura | [docs/README.md](docs/README.md) |
| Crear la BD de la app | [docs/01_crear_bd.md](docs/01_crear_bd.md) |
| Sincronizar desde el ERP | [docs/02_sync_erp.md](docs/02_sync_erp.md) |
| API (endpoints y ejemplos) | [docs/03_api.md](docs/03_api.md) |
| Probar en móvil y web | [docs/04_pruebas.md](docs/04_pruebas.md) |
| Configuración de la IP (automática/manual) | [docs/06_ip_configuracion.md](docs/06_ip_configuracion.md) |
| Despliegue automático (GitHub Actions) | [docs/07_despliegue.md](docs/07_despliegue.md) |
| Roles, permisos, dashboard y configuración | [docs/08_roles_permisos.md](docs/08_roles_permisos.md) |
| Desplegar en producción | [docs/05_produccion.md](docs/05_produccion.md) |

## Puesta en marcha en 5 pasos

```powershell
# 1) Crear la BD de la app (una sola vez)
cmd /c "mysql -u admin -padm.123 -h 127.0.0.1 < `"C:\OpenCode\DocPendientes\sql\00_crear_bd.sql`""
cmd /c "mysql -u admin -padm.123 -h 127.0.0.1 < `"C:\OpenCode\DocPendientes\sql\04_usuarios_app.sql`""

# 2) Instalar dependencias del backend
cd C:\OpenCode\DocPendientes\api
npm install

# 3) Sincronizar datos desde el ERP (solo lectura)
npm run sync

# 4) Crear usuario de prueba y arrancar la API
npm run seed
npm start

# 5) Frontends (en otras terminales)
#    Web de gestión (empleados/vendedores) en http://localhost:5173
cd C:\OpenCode\DocPendientes\web
npm install
npm run dev

#    App móvil de campo (vendedores) — web de desarrollo y Expo Go
cd C:\OpenCode\DocPendientes\movil
npx expo start --web
```

Login de prueba: **admin01 / 123456** · **emplead01 / 123456** · **vendedor01 / 123456**

## Estado actual

- ✅ BD de la app creada y verificada (10 objetos)
- ✅ Sync con el ERP real funcionando (176 vendedores, 13,953 clientes, 410
  documentos pendientes, 52,416 incidencias descargadas)
- ✅ API REST completa y probada end-to-end
- ✅ Roles y permisos (admin/empleado/vendedor), dashboard, menú por perfil,
  sincronización manual y gestión de usuarios
- ✅ **Web de gestión** (`web/`, Vite + React): login, dashboard, clientes con
  detalle y documentos, reportes, incidencias con filtros, configuración;
  menú por permisos (empleados/admin/vendedores con interfaz de escritorio)
- ✅ **App móvil de campo** (`movil/`, Expo): flujo del vendedor para registrar
  visitas/incidencias; tema claro/oscuro; calendarios en filtros
- ✅ Documentación completa en `docs/`
- ✅ Repositorio en GitHub y workflow de despliegue automático configurado
- ⏳ Envío de incidencias al ERP (requiere escritura en `mcoinci010/020`)
- ⏳ Compilación APK/IPA para producción

## Nota sobre los scripts `sql\01_02_03`

Los scripts `01_sync_maestros.sql`, `02_sync_documentos.sql` y
`03_sync_incidencias.sql` asumían que el ERP estaba en la **misma instancia**
MySQL. Como el ERP real es un **servidor remoto**, la sincronización ahora se
hace con el script Node `api\sync.js` (ver `docs/02_sync_erp.md`). Se conservan
como referencia.
