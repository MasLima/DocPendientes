# Roles, permisos, dashboard, sincronización y usuarios

Documenta la **Fase 3**: menú lateral por perfil, dashboard, configuración
(sincronización manual y gestión de usuarios) y la sincronización de incidencias
desde el ERP.

## 1. Modelo de roles y permisos

La BD local (`cobranza_app`) almacena el modelo en 3 tablas:

| Tabla | Contenido |
|---|---|
| `usuarios_app` | usuarios con columnas `rol` y `permisos` (JSON) |
| `permisos` | catálogo de 23 códigos de permiso (10 módulos) |
| `roles_permisos` | asignación por perfil: admin=23, gerencia=21, sistemas=21, empleado=14, vendedor=11, contabilidad=8 |

La columna `usuarios_app.permisos` es un **JSON con los permisos efectivos** del
usuario. Si es `NULL`, al iniciar sesión se calculan desde `roles_permisos`. Si
se indica un JSON, se usan esos (prefijo `-` en un código lo quita del conjunto
base): permite **personalizar** permisos por usuario.

### Catálogo de permisos (23)

| Código | Módulo | Descripción |
|---|---|---|
| `articulos.ver` | articulos | Ver el catálogo de artículos |
| `articulos.detalle` | articulos | Ver el detalle de un artículo |
| `clientes.ver` | clientes | Ver la lista de clientes |
| `clientes.ver_todos` | clientes | Ver clientes de todos los vendedores |
| `clientes.detalle` | clientes | Ver el detalle y documentos de un cliente |
| `documentos.ver` | documentos | Ver documentos de un cliente |
| `incidencias.ver` | incidencias | Ver incidencias |
| `incidencias.ver_todas` | incidencias | Ver incidencias de todos los vendedores |
| `incidencias.crear` | incidencias | Registrar incidencias |
| `incidencias.editar` | incidencias | Editar incidencias locales (no del ERP) |
| `incidencias.todas` | incidencias | Listado global de clientes/incidencias (`?todos=1`) |
| `reportes.saldos` | reportes | Ver reporte de saldos por vendedor |
| `reportes.vendedor` | reportes | Ver reporte detallado por vendedor |
| `dashboard.ver` | dashboard | Ver el dashboard |
| `sync.ejecutar` | sync | Ejecutar la sincronización manual |
| `sync.ver_log` | sync | Ver el historial de sincronizaciones |
| `config.ver` | config | Acceder a configuración |
| `config.usuarios` | config | Gestión de usuarios (CRUD) |
| `config.datos` | config | Configuración de datos/parametros |
| `config.permisos` | config | Configuración de permisos por rol |
| `vencimientos.config` | vencimientos | Administrar rangos de vencimiento (CRUD) |
| `whatsapp.ver` | whatsapp | Ver el módulo de WhatsApp |
| `whatsapp.enviar` | whatsapp | Enviar mensajes de WhatsApp |

### Roles estándar

| Rol | Permisos | Alcance de datos |
|---|---|---|
| `admin` | 23 (todos) | Todos (incluye Configuración y WhatsApp) |
| `gerencia` | 21 (sin `whatsapp.*`) | Todos |
| `sistemas` | 21 (sin `whatsapp.*`) | Todos |
| `empleado` | 14 (sin `config.*`, `sync.*`, `vencimientos.config`, `whatsapp.*`) | Todos (ver_todos) |
| `vendedor` | 11 (sin `*_todos`, sin config/sync/vencimientos) | Solo los suyos |
| `contabilidad` | 8 (artículos, clientes, dashboard, reportes) | Todos |

## 2. Backend

### Middleware

- `api/src/middleware/auth.js`: valida el JWT y **carga `rol` + `permisos` desde
  la BD** en `req.user` para cada request. Exporta `cargarPermisos(id)`.
- `api/src/middleware/permisos.js`: exporta `requirePermiso('codigo')` — rechaza
  con **403** si el usuario no tiene el permiso.

### Rutas nuevas

| Ruta | Permiso | Descripción |
|---|---|---|
| `POST /api/auth/login` | — | Devuelve `{ token, usuario: { rol, permisos, ... } }` |
| `GET /api/usuarios` | `config.usuarios` | Lista de usuarios (con vendedor asignado) |
| `GET /api/usuarios/vendedores-disponibles` | `config.usuarios` | Vendedores del ERP para asignar |
| `POST /api/usuarios` | `config.usuarios` | Crear usuario (valida que el vendedor exista en el ERP) |
| `PUT /api/usuarios/:id` | `config.usuarios` | Actualizar (rol, activo, permisos, password opcional) |
| `DELETE /api/usuarios/:id` | `config.usuarios` | Desactivar usuario |
| `GET /api/perfiles` | — | Catálogo de permisos por rol (módulos y códigos) |
| `PUT /api/perfiles/:rol` | `config.permisos` | Guardar la asignación de permisos de un rol |
| `POST /api/sync/ejecutar` | `sync.ejecutar` | Sincronización manual (`procesos`, `modo`) |
| `GET /api/sync/log` | `sync.ver_log` | Historial de `sync_log` |
| `GET /api/sync/estado` | `sync.ver_log` | Estado de la sincronización en curso |
| `GET /api/config/vencimientos` | `vencimientos.config` | Lista de rangos de vencimiento |
| `POST /api/config/vencimientos` | `vencimientos.config` | Crear rango |
| `PUT /api/config/vencimientos/:id` | `vencimientos.config` | Editar rango |
| `DELETE /api/config/vencimientos/:id` | `vencimientos.config` | Eliminar rango |
| `PUT /api/incidencias/:codi` | `incidencias.editar` | Editar incidencia local (las del ERP son solo lectura) |
| `GET /api/clientes?todos=1` | `incidencias.todas` o `clientes.ver_todos` | Lista global (sin el permiso se filtra por vendedor) |
| `GET /api/clientes/vencimientos?cliente=` | — | Documentos vencidos de un cliente (pestaña Vencimientos) |
| `GET /api/dashboard/saldos-por-vendedor` | — | Saldos por vendedor |
| `GET /api/dashboard/top-clientes` | — | Top 10 deudores (filtra por vendedor) |
| `GET /api/dashboard/documentos-antiguedad` | — | Documentos por antigüedad (al día, 1-30, 31-60, 61-90, +90) |
| `GET /api/dashboard/incidencias-resumen` | — | Resumen incidencias + frecuencia de visitas |
| `GET /api/incidencias/frecuencia` | — | Frecuencia de visitas por cliente |
| `POST /api/incidencias` | — | Alta con o sin cliente (`ter_cote` opcional) |
| `POST /api/whatsapp/enviar-vencimiento` | — | Envío por cliente con `mensaje` editable (override del template) |

Los endpoints del dashboard y de clientes/incidencias **filtran por vendedor**
(`use_emno`/`ter_cote` del usuario) cuando el usuario no tiene el permiso
`*_ver_todas`. Un vendedor recibe **403** en las rutas de sync/config.

### Sincronización de incidencias

`api/src/services/syncService.js` descarga incidencias del ERP:

- `mcoinci010` (cabecera) y `mcoinci020` (detalle) → tablas `incidencias` e
  `incidencia_detalle`.
- El índice único `uq_inc_erp` sobre `incidencias.inc_codi_erp` hace el
  **upsert**: re-descargar no duplica (solo actualiza).
- Las incidencias se crean en la BD local con `sincronizada = 0` cuando son
  locales; las del ERP conservan su `inc_codi_erp`.

## 3. Frontend (menú lateral por perfil)

`movil/App.js` usa **`@react-navigation/drawer`** (requiere
`react-native-reanimated`, `react-native-worklets` y
`react-native-gesture-handler`; se instalan con `npx expo install`).

- El **menú lateral** se construye dinámicamente según los permisos del usuario:
  - `dashboard.ver` → Dashboard
  - `clientes.ver` → Clientes
  - `reportes.saldos` → Reportes
  - `incidencias.ver` → Incidencias
  - `sync.ejecutar` o `config.usuarios` → Configuración
- Los stacks internos (detalle de cliente, nueva incidencia) viven en el
  **stack raíz** sobre el drawer.
- El header incluye el **botón "Salir"** (`LogoutButton`), que se muestra si hay
  token. La sesión persiste token + usuario en AsyncStorage.

### Pantallas

| Pantalla | Contenido |
|---|---|
| `DashboardScreen` | Bienvenida, documentos por antigüedad (barras), top clientes deudores, saldos por vendedor, incidencias y frecuencia de visitas |
| `ConfiguracionScreen` | Pestañas: **Sincronización** (ejecutar + log) y **Usuarios** (CRUD) — solo admin |
| `IncidenciasScreen` | Pestañas: **Historial** e **Frecuencia** (visitas por cliente) |
| `NuevaIncidenciaScreen` | Alta con o sin cliente (código opcional) |

## 4. Usuarios de prueba

`api/seed.js` crea (clave `123456`):

| Login | Rol | Vendedor |
|---|---|---|
| `admin01` | admin | — |
| `emplead01` | empleado | — |
| `vendedor01` | vendedor | `300029` (ESPINOZA GARCIA MERLY) |

## 5. Probar

1. `cd api` → `npm start` (API en `localhost:3000`).
2. `cd movil` → `npx expo start --web` → abrir `http://localhost:8081`.
3. Iniciar sesión con `admin01` (menú completo + Configuración), `emplead01` o
   `vendedor01` (solo sus datos).
4. En Configuración (admin): ejecutar **sincronización manual** y gestionar
   usuarios.