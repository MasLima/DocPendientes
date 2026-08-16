# 06 — Configuración de la IP (móvil y web)

Esta guía explica **qué IP usa la app, por qué cambia** y **cómo ajustarla**
tanto de forma automática como manual.

## 1. Qué es una IP local

Tu PC tiene un "número de casa" dentro de tu red Wi-Fi, llamado **dirección
IPv4** (ej. `192.168.101.5`). Ese número lo asigna el router y **puede
cambiar** cada vez que te conectas (o cuando el router la reasigna).

Ejemplo real de este proyecto (antes y después):

```
Antes: 192.168.1.4     (IP vieja del Wi-Fi)
Ahora: 192.168.101.5   (IP actual del Wi-Fi)
```

## 2. Las dos IPs que intervienen

### A) IP de Metro (la del QR) — se autoajusta

```
exp://192.168.101.5:8081
```

- Metro (el empaquetador de Expo) la genera solo al arrancar con
  `npx expo start`.
- El teléfono la usa para **descargar el código de la app** (el "bundle").
- Como la genera Expo, **siempre está actualizada** y aparece en la terminal:
  `Metro: exp://192.168.101.5:8081`.

### B) IP de la API (la de los datos) — hoy automática

```
http://192.168.101.5:3000/api
```

- La app la usa **después del login** para pedir clientes, documentos, etc.
- Antes estaba escrita a mano en `movil\src\config.js`.
- **Ahora se detecta automáticamente** a partir del host de Metro (ver abajo),
  por lo que suele coincidir con la IP del QR.

## 3. Cómo funciona la detección automática

El archivo `movil\src\config.js` hace esto:

1. **En web**: usa `localhost` (el navegador corre en el mismo PC que la API).
2. **En móvil**: lee `Constants.expoConfig.hostUri` (provee `expo-constants`),
   que contiene la IP que el teléfono ya usó para cargar la app de Metro
   (ej. `192.168.101.5:8081`).
3. Le quita el puerto (`:8081`) y construye la URL de la API con el puerto 3000.
4. **Si la detección falla**, usa la IP manual de respaldo (`IP_LAN_MANUAL`).

```js
// movil/src/config.js (resumen)
const PORT_API = 3000;
const IP_LAN_MANUAL = '192.168.101.5';   // respaldo manual

function obtenerHostApi() {
  if (Platform.OS === 'web') return 'localhost';
  const hostUri = Constants.expoConfig?.hostUri; // "192.168.101.5:8081"
  if (hostUri) return hostUri.replace(/:\d+$/, '');
  return IP_LAN_MANUAL;
}
```

### ¿Qué pasa si la IP cambia?

- **Metro** (QR) → se actualiza sola al ejecutar `npx expo start`.
- **API** → también, porque se deriva del host de Metro.
- **Regla de oro:** si cambias de Wi-Fi, presiona **`r`** en la terminal de Expo
  para que la app recargue con la nueva IP, y en el teléfono recarga
  (sacude → **Reload**).

## 4. Cambio de IP MANUAL (caso de excepción)

Si la detección automática falla o quieres forzar una IP específica:

**Paso 1 — Ver tu IP actual** (PowerShell o cmd):

```powershell
ipconfig
```

Buscar en el adaptador **Wi-Fi / Wireless LAN** el campo **Dirección IPv4**
(`192.168.x.x`).

**Paso 2 — Editar** `movil\src\config.js`:

```js
const IP_LAN_MANUAL = '192.168.101.5';   // ← pon aquí la IP nueva
```

**Paso 3 — Recargar la app:**

| Plataforma | Cómo |
|---|---|
| Terminal de Expo | Presionar **`r`** |
| Teléfono (Expo Go) | Sacudir → **Reload** (o cerrar y abrir) |
| Web | Refrescar el navegador (F5) |

> **Truco:** la IP que muestra el QR (`exp://IP:8081`) es la misma que debes
> usar. Si el QR dice `192.168.101.5`, pon `192.168.101.5` en `IP_LAN_MANUAL`.

## 5. Resumen rápido

| Situación | IP del QR | IP de la API | Acción |
|---|---|---|---|
| Mismo Wi-Fi, IP igual | `192.168.101.5` | automática | Ninguna |
| Cambiaste de Wi-Fi | `192.168.X.Y` | automática (se deriva del QR) | Presionar `r` en Expo y recargar teléfono |
| Detección automática falla | `192.168.X.Y` | manual | Editar `IP_LAN_MANUAL` en `config.js` y recargar |
| Producción (celular) | n/a | dominio (`https://api.miempresa.com`) | Configurar en `config.js` el dominio |

## 6. Enlaces relacionados

- Verificación de conectividad: `04_pruebas.md` (tabla de solución de problemas).
- Despliegue en producción (dominios): `05_produccion.md`.