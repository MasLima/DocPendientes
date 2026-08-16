# 04 — Pruebas en móvil y en web

La misma app Expo funciona en **móvil** (Expo Go) y en **web** (navegador).

## Requisitos

1. API corriendo (ver `03_api.md`): `cd api && npm start`
2. Datos sincronizados del ERP (ver `02_sync_erp.md`): `npm run sync`
3. Usuario de prueba creado: `npm run seed`

## Prueba en WEB

```powershell
cd C:\OpenCode\DocPendientes\movil
npx expo start --web
```

Abrir el navegador en `http://localhost:8081` (o el puerto que muestre Expo).

En web la URL de la API es `http://localhost:3000/api` automáticamente
(`Platform.OS === 'web'`), ver `movil\src\config.js`. No se necesita editar nada.

**Flujo de verificación:**
1. Login con `vendedor01` / `123456`.
2. Pestaña **Clientes** → lista de clientes del vendedor.
3. Tocar un cliente → detalle con saldos por moneda y documentos vencidos.
4. Pestaña **Reportes** → saldos por cliente con total pendiente.
5. Pestaña **Incidencias** → listar y registrar una incidencia nueva.
6. Botón **Salir** (icono en la barra superior) → vuelve al login y limpia la sesión.

## Prueba en MÓVIL (Expo Go)

> La IP del API se detecta **automáticamente** desde el host de Metro
> (ver `06_ip_configuracion.md`). Solo necesitas que PC y teléfono estén en el
> **mismo Wi-Fi**.

1. Instalar la app **Expo Go** en el teléfono (Play Store / App Store).
2. Conectar el teléfono al **mismo Wi-Fi** que el PC.
3. Iniciar Expo en el PC:

```powershell
cd C:\OpenCode\DocPendientes\movil
npx expo start
```

4. En Expo Go:
   - **Android**: tocar *Scan QR code* y escanear el QR de la terminal.
   - **iOS**: abrir la cámara y apuntar al QR.
   - Alternativa: escribir manualmente `exp://<IP-del-PC>:8081` en Expo Go.

5. Ingresar con `vendedor01` / `123456` y seguir el mismo flujo que en web.
6. Probar el botón **Salir** en la barra superior.

## Verificación de conectividad (solución de problemas)

| Síntoma | Revisar |
|---|---|
| Login da "Error de conexión" | Que la API esté corriendo: `http://localhost:3000/api/health` |
| El móvil no carga la app | Que PC y teléfono estén en el mismo Wi-Fi |
| El móvil llega al login pero falla al entrar | IP del API: ver `06_ip_configuracion.md` (generalmente se resuelve con `npx expo start` y `r`) |
| El móvil no llega a la API | Abrir en el navegador del teléfono `http://<IP-del-PC>:3000/api/health` |
| Firewall | Aceptar el aviso de Windows al abrir puertos 3000 y 8081 en red privada |

## Datos de prueba observados (agosto 2026)

- Vendedores sincronizados: 176
- Clientes sincronizados: 13,953
- Documentos pendientes: 410
- Vendedor de prueba: `300029` (ESPINOZA GARCIA MERLY) con 114 documentos
  y ~S/ 703,498.21 de saldo.
- Ejemplo de cliente con pendientes: `104015` CONSORCIO ALTA MODA S.R.L.
  (3 documentos, saldo S/ 239.19).