# 11 — Build de APK y Descarga desde el Servidor

## Compilar APK localmente

### Prerrequisitos (una sola vez)

1. **JDK 17** (Azul Zulu): `C:\Program Files\Zulu\zulu-17`
2. **Android SDK** en `C:\Android\Sdk` con:
   - `cmdline-tools/latest`
   - `platforms;android-36`
   - `build-tools;36.0.0`
   - `ndk;27.1.12297006`
   - `cmake;3.22.1`
3. **Variables de entorno** del usuario:
   ```
   JAVA_HOME=C:\Program Files\Zulu\zulu-17
   ANDROID_HOME=C:\Android\Sdk
   Path += ...\platform-tools;...\cmdline-tools\latest\bin
   ```

### Pasos del build

```powershell
# 1. Limpiar y generar carpeta android/
cd C:\OpenCode\DocPendientes\movil
npx expo prebuild --platform android --clean

# 2. Compilar APK Release (solo arm64-v8a, ~24 min)
cd android
.\gradlew.bat assembleRelease --no-daemon --rerun-tasks

# 3. Copiar APK a carpeta de descarga (el nombre debe llevar la version)
Copy-Item "android\app\build\outputs\apk\release\app-release.apk" `
  "..\..\apk\Cobranza-v1.7.0.apk" -Force
```

El APK resultante queda en `apk/Cobranza-v1.7.0.apk` (~38 MB).

### Configuración del build

| Parámetro | Valor |
|---|---|
| `minSdkVersion` | 24 (Android 7.0+) |
| `targetSdkVersion` | 36 |
| `applicationId` | `com.docpendientes.cobranza` |
| Arquitectura | `arm64-v8a` únicamente |
| Signing | debug keystore (para pruebas) |
| JVM Memory | `-Xmx4096m -XX:MaxMetaspaceSize=1024m` |

> **Nota:** El keystore debug funciona para instalación directa. Si el usuario
> ya tiene una versión instalada con firma diferente (ej. EAS Build), debe
> **desinstalar la app primero** antes de instalar el APK.

## Servir APK desde el servidor

### Rutas API (sin autenticación)

| Ruta | Uso |
|---|---|
| `GET /api/version` | Devuelve `{ version, nombre, tamano, url }` del APK más reciente |
| `GET /api/download/apk` | Descarga el APK más reciente de la carpeta `apk/` |

`/api/version` y `/api/download/apk` responden con `Cache-Control: no-store`
para que el teléfono nunca reutilice una respuesta vieja.

El APK más reciente se elige por **versión del nombre del archivo**
(`Cobranza-vX.Y.Z.apk`) y, si no hay número, por fecha de modificación.
Por eso el archivo **debe** llamarse con la versión.

## Actualizador in-app

La APK incluye un actualizador (`movil/src/components/Actualizador.js` +
`movil/src/services/actualizacion.js`):

- Consulta `/api/version` al abrir la app (4 s), al volver a primer plano y
  cada 15 min.
- Compara con la versión instalada (`Constants.expoConfig.version`).
- Si hay una mayor, muestra el modal **Nueva versión disponible**:
  descarga `/api/download/apk` con progreso y abre el instalador de Android.
- **Después** oculta esa versión por **24 horas** (antes era para siempre).
- En **Configuración → Versión de la app** se ve la versión instalada, la del
  servidor, la última verificación y el botón **Buscar actualización**
  (ignora el "Después" y fuerza la consulta).

### Regla al publicar una versión nueva

1. Subir **`version`** y **`versionCode`** en `movil/app.json`
   (`versionCode` debe ser mayor que el anterior o Android no deja instalar
   encima).
2. Compilar el APK y copiarlo como `apk/Cobranza-vX.Y.Z.apk` en el servidor.
3. No hace falta reiniciar la API: la carpeta `apk/` se lee en cada petición.

> Si la app instalada es **1.3.0 o anterior**, esa APK no tiene actualizador:
> hay que instalar la versión nueva una sola vez a mano.

### Setup en el servidor

```powershell
# Copiar APK al servidor
Copy-Item "C:\OpenCode\DocPendientes\apk" `
  "\\190.12.91.41\C$\OpenCode\DocPendientes\apk" -Recurse -Force

# Copiar app.js actualizado (si se modificó)
Copy-Item "C:\OpenCode\DocPendientes\api\src\app.js" `
  "\\190.12.91.41\C$\OpenCode\DocPendientes\api\src\app.js" -Force

# Reiniciar API (en el servidor por RDP)
pm2 restart cobranza-api
```

### URL de descarga

```
http://190.12.91.41:3000/api/download/apk
```

Los usuarios abren esta URL en el navegador del teléfono y descargan
directamente el APK.

## Solución de problemas

| Problema | Causa | Solución |
|---|---|---|
| "No se instaló la app" | Firma diferente a la existente | Desinstalar la app primero, luego instalar |
| Build falla por NDK | NDK incompleto | Reinstalar: `sdkmanager "ndk;27.1.12297006"` |
| Build muy lento | Compila 4 arquitecturas | Verificar `reactNativeArchitectures=arm64-v8a` en `gradle.properties` |
| Timeout Gradle | Metaspace insuficiente | Aumentar `org.gradle.jvmargs` en `gradle.properties` |
| No aparece "Nueva versión" | Se tocó "Después" (24 h) | Configuración → Versión de la app → **Buscar actualización** |
| No aparece "Nueva versión" | APK instalada es 1.3.0 o anterior | Instalar la versión nueva manualmente una vez |
| No aparece "Nueva versión" | `version`/`versionCode` no subieron en `app.json` | Subir ambos y recompilar |
| "El servidor no informa versión" | API vieja sin `/api/version` | Copiar `api/src/app.js` y `pm2 restart cobranza-api` |
