# 02 — Sincronización desde el ERP

El sync lee del **ERP (solo lectura)** y escribe en la **BD de la app**.
Se ejecuta como un script de Node dentro de la carpeta `api`.

## Fuentes de información en el ERP

| Dato | Tabla ERP | Filtro |
|---|---|---|
| Vendedores | `mplter001` | `ter_tite = '300000'` |
| Clientes | `mplter001` | `ter_tite = '100000'` |
| Login del vendedor | `mtguse001` | `use_emno = ter_cote` (join opcional) |
| Documentos CxC | `mficob100` | estados `NOT IN (80, 86, 90)` |
| Pagos aplicados | `mficob200` | `cob_stat IN ('10','18','90')` y `cob_tivo+cob_nuvo` = documento |
| Estados | `mplgen006` | catálogo (se copia local) |
| Monedas | `mplcom009` | catálogo (se copia local) |

## Regla de "pendiente"

Un documento es **pendiente** si:

```
saldo = cob_impo − SUM(pagos_validos) > 0.01
```

- Pagos válidos = filas de `mficob200` con `cob_stat` en `10`, `18` o `90`
  (el estado `80` = anulado **no** cuenta).
- Se excluyen documentos con `cob_stat` en `80`, `86`, `90`
  (anulado / eliminado / cerrado).

## Paso 1: Configurar credenciales

Editar `api\.env`:

```ini
# BD de la app (local en pruebas, otro servidor en producción)
DB_HOST=localhost
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=adm.123
DB_NAME=cobranza_app

# ERP - SOLO LECTURA
ERP_HOST=dm.integrator.pe
ERP_PORT=3306
ERP_USER=coloma
ERP_PASSWORD="Coloma#Integrator"
ERP_DB=db0010_01
```

> ⚠️ El password del ERP **va entre comillas** en `.env` porque contiene el
> carácter `#`, que `dotenv` interpretaría como comentario si no se encierra.

## Paso 2: Ejecutar el sync

```powershell
cd C:\OpenCode\DocPendientes\api
npm install
npm run sync
```

Salida esperada:

```
=== SYNC MAESTROS ===
  Vendedores en ERP: 176
  Vendedores insertados: 176
  Clientes en ERP: 13953
  Clientes insertados: 13953
=== SYNC DOCUMENTOS PENDIENTES ===
  Documentos pendientes en ERP: 410
  Documentos pendientes cargados: 410
SYNC COMPLETADO OK
  Vendedores: 176
  Clientes:   13953
  Pendientes: 410
```

## Paso 3: Verificar

```powershell
mysql -u admin -padm.123 -h 127.0.0.1 cobranza_app -e "SELECT * FROM sync_log ORDER BY id DESC LIMIT 3;"
mysql -u admin -padm.123 -h 127.0.0.1 cobranza_app -e "SELECT * FROM vw_documentos_pendientes LIMIT 5;"
```

## Frecuencia de sincronización

- Hasta 24 horas de desfase con refresco manual (`npm run sync`).
- En producción se puede programar con el **Programador de tareas de Windows**
  (ver `05_produccion.md`) o un cron en Linux.

## Notas

- El script usa `REPLACE INTO` para maestros (idempotente) y `DELETE + INSERT`
  para documentos (full refresh).
- Cada ejecución registra una fila en `sync_log`.
- Si falla la conexión al ERP, no se toca la BD de la app (primero se lee todo
  y recién después se escribe).
