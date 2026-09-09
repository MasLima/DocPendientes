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

# 3. Copiar APK a carpeta de descarga
Copy-Item "android\app\build\outputs\apk\release\app-release.apk" `
  "..\..\apk\Cobranza-v1.0.0.apk" -Force
```

El APK resultante está en `apk/Cobranza-v1.0.0.apk` (~34 MB).

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

### Ruta API

`GET /api/download/apk` — sin autenticación. Sirve el primer `.apk` de la
carpeta `apk/` con headers de descarga.

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
