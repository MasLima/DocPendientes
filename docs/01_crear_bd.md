# 01 — Creación de la BD de la app

La BD de la app **no depende del ERP**. Se crea una sola vez y contiene los
catálogos, maestros y documentos que la API sirve al móvil/web.

## Requisitos

- MySQL o MariaDB (cualquier versión reciente).
- Un usuario con permisos de creación de BD (en pruebas: `admin` / `adm.123`).

## Paso 1: Ejecutar el script de creación

Abrir una consola y ejecutar:

```powershell
cmd /c "mysql -u admin -padm.123 -h 127.0.0.1 < `"C:\OpenCode\DocPendientes\sql\00_crear_bd.sql`""
```

> Nota: en PowerShell no se puede usar `<` para redirigir entrada; por eso se
> envuelve en `cmd /c`. Alternativa: abrir el archivo en **MySQL Workbench**
> (pestaña *File → Open SQL Script*) y ejecutarlo con el botón de rayo.

## Paso 2: Verificar

```powershell
mysql -u admin -padm.123 -h 127.0.0.1 -e "SHOW TABLES FROM cobranza_app;"
```

Debe listar:

| Objeto | Tipo | Descripción |
|---|---|---|
| `vendedores` | tabla | Vendedores sincronizados del ERP |
| `clientes` | tabla | Clientes sincronizados del ERP |
| `documentos` | tabla | Documentos pendientes (con saldo) |
| `incidencias` | tabla | Incidencias registradas por el vendedor |
| `incidencia_detalle` | tabla | Detalle de incidencias |
| `sync_log` | tabla | Bitácora de sincronización |
| `monedas` | tabla | Catálogo de monedas (local) |
| `estados_documento` | tabla | Catálogo de estados (local) |
| `usuarios_app` | tabla | Usuarios de la app (autenticación propia) |
| `vw_documentos_pendientes` | vista | Documentos pendientes enriquecidos para la API |

## Paso 3: Crear la tabla de usuarios de la app

```powershell
cmd /c "mysql -u admin -padm.123 -h 127.0.0.1 < `"C:\OpenCode\DocPendientes\sql\04_usuarios_app.sql`""
```

> ⚠️ La tabla `usuarios_app` es la **autenticación propia de la app**, no se
> lee del ERP. Contiene el hash bcrypt de la contraseña (nunca la contraseña
> en texto plano).

## Catálogos locales

El script `00_crear_bd.sql` también carga catálogos **locales** para que la BD
sea autónoma (no consulta tablas del ERP en tiempo de ejecución):

- **`monedas`**: `PEN` (S/.), `USD` (US$), `U2`→dólar, `EUR`.
- **`estados_documento`**: copia de `mplgen006` del ERP (10 EMITIDO, 16 EN
  COBRANZA, 40 PARCIAL, 60 PAGADO, 80 ANULADO, etc.).

Los catálogos se pueden refrescar luego desde el ERP (ver `02_sync_erp.md`).

## Notas de diseño

- **Identidad del documento**: `(cob_codo, cob_seri, cob_nums)`. Un voucher
  CxC (`cob_tivo+cob_nuvo`) puede agrupar varios documentos físicos.
- **Saldo pendiente**: se calcula en el sync como `cob_impo − pagos`. No se
  usa `cob_stat` para decidir pendiente; solo se excluyen los estados
  `80/86/90` (anulado/eliminado/cerrado).
- Los ancho de columna (`clientes.ter_dire` 180, `ter_rucn` 20, `ter_emai` 100)
  están calibrados contra `mplter001` del ERP real.
