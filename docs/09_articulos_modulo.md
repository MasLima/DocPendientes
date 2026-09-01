# 09 — Módulo de Artículos

Catálogo de productos sincronizados desde el ERP (solo lectura).
Incluye UI en el frontend web, API REST, sincronización con el ERP, y exportación.

---

## 1. Tabla `articulos` en la BD local

### Estructura completa

```sql
CREATE TABLE IF NOT EXISTS articulos (
  ite_item      VARCHAR(20) NOT NULL PRIMARY KEY,
  ite_dsit      VARCHAR(100) NULL,
  ite_dste      TEXT NULL,
  ite_uven      VARCHAR(3) NULL,
  ite_ucom      VARCHAR(3) NULL,
  ite_usto      VARCHAR(3) NULL,
  ite_imag      VARCHAR(90) NULL,
  ite_coar      VARCHAR(13) NULL,
  ite_coli      VARCHAR(6) NULL,
  ite_cofa      VARCHAR(6) NULL,
  ite_esta      VARCHAR(2) NULL,
  ite_pruv      DOUBLE NULL,
  ite_feuv      DATE NULL,
  ite_copr      DOUBLE NULL,
  ite_codl      DOUBLE NULL,
  saldo         DOUBLE NULL DEFAULT 0,
  linea_desc    VARCHAR(60) NULL,
  familia_desc  VARCHAR(120) NULL,
  unidad_desc   VARCHAR(50) NULL,
  estado_desc   VARCHAR(50) NULL,
  fecha_compra  DATE NULL,
  importe_compra DOUBLE NULL,
  uventa_desc   VARCHAR(50) NULL,
  ucompra_desc  VARCHAR(50) NULL,
  ustock_desc   VARCHAR(50) NULL,
  uventa_abrev  VARCHAR(4) NULL,
  ucompra_abrev VARCHAR(4) NULL,
  ustock_abrev  VARCHAR(4) NULL,
  ultima_sync   DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Script SQL

- `sql/06_articulos.sql` — Creación de la tabla completa (con columnas de unidades).
- `sql/07_agregar_columnas_unidades.sql` — ALTER TABLE para agregar las 6 columnas de unidades a una tabla ya existente.

### ALTER TABLE (si la tabla ya existía sin columnas de unidades)

```sql
ALTER TABLE articulos
  ADD COLUMN uventa_desc   VARCHAR(50) NULL AFTER importe_compra,
  ADD COLUMN ucompra_desc  VARCHAR(50) NULL AFTER uventa_desc,
  ADD COLUMN ustock_desc   VARCHAR(50) NULL AFTER ucompra_desc,
  ADD COLUMN uventa_abrev  VARCHAR(4)  NULL AFTER ustock_desc,
  ADD COLUMN ucompra_abrev VARCHAR(4)  NULL AFTER uventa_abrev,
  ADD COLUMN ustock_abrev  VARCHAR(4)  NULL AFTER ucompra_abrev;
```

### Índices

```sql
CREATE INDEX idx_articulos_linea   ON articulos(ite_coli);
CREATE INDEX idx_articulos_familia ON articulos(ite_cofa);
CREATE INDEX idx_articulos_estado  ON articulos(ite_esta);
```

---

## 2. Fuentes de datos en el ERP (solo lectura)

| Dato | Tabla ERP | Relación |
|---|---|---|
| Items (productos) | `mplite001` | PK: `ite_item` |
| Líneas | `mplite003` | FK: `ite_coli` |
| Unidades | `mplite005` | PK: `ite_coum` (se usa como map key) |
| Estados | `mplite011` | PK: `ite_esta` |
| Familias | `mplite014` | PK: `ite_cofa` |
| Stock actual | `mlosto050` | FK: `sto_item` |
| Última compra | `mlosto040` | FK: `sto_item` |

### Relación de unidades

```
mplite001.ite_usto (= "UNI") → mplite005.ite_coum (PK)
  → ite_abum (abreviatura, ej: "UNI")
  → ite_dsum (descripción, ej: "UNIDAD")
```

Misma relación para `ite_uven` (venta) y `ite_ucom` (compra).

### Imágenes

URL: `https://coloma.integrator.pe/data/db0010_01/images/{ite_imag}`
Ejemplo: `103387_ELW842LIM741.jpg`

### Exclusión de artículos BAJA

El sync excluye artículos con estado BAJA usando subquery:

```sql
WHERE i.ite_esta NOT IN (
  SELECT e.ite_esta FROM mplite011 e
  WHERE UPPER(e.ite_dses) LIKE '%BAJA%'
)
```

---

## 3. Sincronización (`syncService.js`)

### Funciones

| Función | Descripción |
|---|---|
| `syncArticulosParcial()` | Solo reemplaza datos (no borra). Usa `REPLACE INTO`. |
| `syncArticulosCompleto()` | Borra todo y vuelve a cargar. Usa `DELETE + INSERT`. |
| `_syncArticulosBase(modo)` | Helper compartido para ambas funciones. |

### Flujo del sync

1. Consulta artículos del ERP (excluye BAJA).
2. Consulta unidades, líneas, familias, estados del ERP.
3. Consulta stock y última compra del ERP.
4. Para cada artículo: completa descripciones de línea, familia, unidad, estado.
5. Detecta si existen columnas de unidades en la BD local (`INFORMATION_SCHEMA`).
6. Inserta con o sin columnas de unidades según disponibilidad.

### Columnas de unidades (detectadas automáticamente)

```javascript
async function tieneColumnasUnidades() {
  const [cols] = await pool.query(
    `SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'articulos'
     AND COLUMN_NAME IN ('uventa_desc','ucompra_desc','ustock_desc',
                         'uventa_abrev','ucompra_abrev','ustock_abrev')`,
    [process.env.DB_NAME]
  );
  return cols[0].total >= 6;
}
```

### Logs del sync

```
[syncArt] unidades del ERP: 120
[syncArt] items del ERP (sin BAJA): 8490
[syncArt] unidades: 120
[syncArt] familias: 450
[syncArt] conUnidades=true, items=8490, ins=8490, del=0, err=0
```

### Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `ER_WRONG_VALUE_COUNT_ON_ROW` | Columnas y placeholders no coinciden | Verificar que VALUES tenga el mismo número de `?` que columnas |
| `er_no_such_table` | Tabla no existe | Ejecutar `06_articulos.sql` primero |
| `er_bad_field_error` | Columna de unidades no existe | Ejecutar `07_agregar_columnas_unidades.sql` |

---

## 4. API REST (`api/src/routes/articulos.js`)

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/articulos` | Lista con filtros, búsqueda y ordenamiento |
| GET | `/api/articulos/lineas` | Lista de líneas para filtro |
| GET | `/api/articulos/familias` | Lista de familias (filtra por línea si se envía) |
| GET | `/api/articulos/imagen/:nombre` | Sirve imagen local (K:\@Fotos Sistemas) |
| GET | `/api/articulos/:codigo` | Detalle completo de un artículo |

### Parámetros de consulta (GET /api/articulos)

| Parámetro | Ejemplo | Descripción |
|---|---|---|
| `q` | `?q=LED` | Búsqueda por código o nombre |
| `linea` | `?linea=01` | Filtrar por línea |
| `familia` | `?familia=02` | Filtrar por familia |
| `orden` | `?orden=saldo` | Campo de ordenamiento |
| `direccion` | `?direccion=DESC` | ASC o DESC |

### Respuesta del detalle (GET /api/articulos/:codigo)

Devuelve todas las columnas de la tabla `articulos` incluyendo:
- `ustock_abrev`, `uventa_abrev`, `ucompra_abrev`
- `ustock_desc`, `uventa_desc`, `ucompra_desc`
- `fecha_compra`, `importe_compra`
- `saldo`, `linea_desc`, `familia_desc`, `estado_desc`

---

## 5. Frontend Web

### Pantallas

| Pantalla | Ruta | Descripción |
|---|---|---|
| `ArticulosScreen` | `/articulos` | Grid con filtros, búsqueda, ordenamiento, paginación |
| `ArticuloDetalleScreen` | `/articulos/:codigo` | Detalle con tabs (imagen / datos) |

### `ArticulosScreen.jsx`

- **Estilo**: Igual que `ClientesScreen` (grid con tabla HTML).
- **Filtros**: `FiltroLineas` y `FiltroFamilias` (estilo Excel: botón → panel con búsqueda + checkboxes + Aplicar/Cancelar).
- **FiltroFamilias**: Deshabilitado hasta que se seleccione al menos una línea.
- **Búsqueda**: `CampoBusqueda` a la derecha, misma fila que los filtros.
- **Columnas** (en orden): Imagen, Código, Nombre, Estado, Saldo, Und, Línea, Familia, Acciones.
- **Paginación**: 100 registros por página.
- **Ordenamiento**: Clic en encabezado de columna para ASC/DESC.
- **Exportación Excel**: Botón que exporta todas las filas filtradas.
- **Acciones por fila**: Icono documento (detalle) + icono imagen (modal).

### `ArticuloDetalleScreen.jsx`

- **Encabezado fijo**: Código, Descripción, Saldo con unidad.
- **Tab "Imagen"**: Foto grande + nombre de archivo. Al costado: Descripción larga, Unidad stock, Estado, Línea, Familia, Última compra, Importe compra, Última venta, Precio venta.
- **Tab "Datos adicionales"**: Grid de información completa (Estado/Línea/Familia, Unidades, Costos, Fechas, Última sincronización).
- **Exportación PDF**: Incluye imagen del artículo vía canvas → jsPDF `addImage`.

### Componentes nuevos

| Componente | Archivo | Descripción |
|---|---|---|
| `FiltroLineas` | `web/src/components/FiltroLineas.jsx` | Filtro estilo Excel para líneas |
| `FiltroFamilias` | `web/src/components/FiltroFamilias.jsx` | Filtro estilo Excel para familias (depende de líneas) |
| `CampoBusqueda` | `web/src/components/CampoBusqueda.jsx` | Input con icono lupa (paddingLeft forzado después del spread) |
| `Exportar` | `web/src/components/Exportar.jsx` | Exportación Excel/PDF con soporte de imágenes |

---

## 6. Cambios recientes (esta sesión)

### Correcciones

1. **CampoBusqueda**: Se extraen `paddingLeft` y `padding` del style de entrada para evitar que el shorthand `padding: '8px 12px'` sobreescriba el `paddingLeft: 32` del icono lupa.

2. **FiltroFamilias**: Deshabilitado (`opacity: 0.5`, `cursor: not-allowed`, `disabled`) hasta que se seleccione al menos una línea. Al cambiar líneas se cierra y limpia el panel.

3. **Grid Articulos**: Columna "UNIDAD" movida a la derecha de "SALDO", renombrada a "Und" (ancho 50px).

4. **Detalle Articulo**: Se agregaron 4 campos al costado de la imagen: Última compra, Importe compra, Última venta, Precio venta.

5. **Sync BAJA**: Se excluyen artículos con estado BAJA usando subquery contra `mplite011`.

6. **Paginación**: Se eliminó el `LIMIT 500` de la query SQL en `GET /api/articulos`.

7. **Incidencias**: Se muestran solo las últimas 15 por defecto, con botón "Ver historial (N)" que muestra todas con paginación de 15 por página.

### Archivos modificados

- `api/src/routes/articulos.js` — Quitado `LIMIT 500`
- `api/src/services/syncService.js` — Exclusión BAJA, helper `_syncArticulosBase`, detección de columnas
- `web/src/components/CampoBusqueda.jsx` — Fix padding
- `web/src/components/FiltroFamilias.jsx` — Deshabilitado sin líneas
- `web/src/screens/ArticulosScreen.jsx` — Columna UNIDAD movida
- `web/src/screens/ArticuloDetalleScreen.jsx` — Campos de compra/venta
- `web/src/screens/IncidenciasClienteScreen.jsx` — Últimas 15 + historial paginado
- `sql/06_articulos.sql` — Tabla completa con unidades
- `sql/07_agregar_columnas_unidades.sql` — ALTER TABLE para upgrade

---

## 7. Deploy en servidor

### Archivos a copiar

```
api/src/routes/articulos.js
api/src/services/syncService.js
web/dist/                        (rebuild con npm run build)
sql/06_articulos.sql             (si crear tabla nueva)
sql/07_agregar_columnas_unidades.sql  (si upgrade de tabla existente)
```

### Pasos

```powershell
# 1. Copiar archivos al servidor (vía RDP o scp)
# 2. En el servidor:
cd C:\OpenCode\DocPendientes
pm2 restart cobranza-api

# 3. Si es primera vez, ejecutar SQL en MySQL Workbench:
#    06_articulos.sql (crear tabla)
#    07_agregar_columnas_unidades.sql (si tabla ya existe)

# 4. Ejecutar sync completo desde la app (Configuración → Sincronización)
```
