# Plan: WhatsApp Multi-usuario (10-15 vendedores)

## Estado actual

Un solo teléfono conectado. Todos los usuarios envían desde el mismo número.
Arquitectura singleton: un `Client` de whatsapp-web.js, un Chromium, una sesión.

```
┌──────────┐     ┌──────────┐     ┌─────────────────┐
│ Usuario 1│────▶│          │     │ 1 Chromium ~200MB│
│ Usuario 2│────▶│  1 solo  │────▶│ 1 sesión WA     │
│ Usuario 3│────▶│  cliente │     │ 1 número telef. │
└──────────┘     └──────────┘     └─────────────────┘
                  SINGLETON
```

## Arquitectura objetivo

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│ Usuario 1│────▶│ Session Pool │────▶│ Chromium #1 200MB│ → +51999111111
│ Usuario 2│────▶│              │────▶│ Chromium #2 200MB│ → +51999222222
│ Usuario 3│────▶│ req.user.id  │────▶│ Chromium #3 200MB│ → +51999333333
└──────────┘     └──────────────┘     └─────────────────┘
                  SessionPool.js        1 sesión por usuario
```

## Recursos estimados

| Componente | RAM actual | Con 15 sesiones |
|---|---|---|
| MySQL (XAMPP) | ~500 MB | ~500 MB |
| Node.js API | ~150 MB | ~200 MB |
| Puppeteer × 15 | 0 | ~3 GB |
| Chrome OS/cache | ~200 MB | ~500 MB |
| **Total** | **~850 MB** | **~4.2 GB** |
| **Servidor (16 GB)** | | **✅ Suficiente** |

| Recurso | Por sesión | 5 sesiones | 10 sesiones | 15 sesiones |
|---|---|---|---|---|
| RAM (Chromium) | ~200 MB | ~1 GB | ~2 GB | ~3 GB |
| CPU (idle) | ~2% | ~10% | ~20% | ~30% |
| CPU (enviando) | ~15% | ~50% | ⚠️ | ⚠️ |
| Disco (sesiones) | ~50 MB | ~250 MB | ~500 MB | ~750 MB |

## Cambios necesarios

### 1. Base de datos — `sql/09_whatsapp_sesiones.sql` (nuevo)

```sql
CREATE TABLE IF NOT EXISTS whatsapp_sesiones (
  user_id       INT NOT NULL PRIMARY KEY,
  estado        ENUM('desconectado','esperando_qr','conectado','error') DEFAULT 'desconectado',
  telefono      VARCHAR(20) NULL,
  pushname      VARCHAR(100) NULL,
  sesion_dir    VARCHAR(200) NULL COMMENT 'Ruta carpeta de sesion',
  ultima_sync   DATETIME NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios_app(id)
);

-- Permisos para admin
INSERT IGNORE INTO permisos (codigo, descripcion, modulo) VALUES
('whatsapp.admin', 'Administrar sesiones WhatsApp de otros usuarios', 'whatsapp');
```

### 2. Backend — `api/src/services/whatsappPool.js` (nuevo, reemplaza whatsappService.js)

- Mapa de sesiones: `Map<userId, { client, estado, qrCode, info, sesionDir }>`
- `getOrCreate(userId)` — crea sesión con carpeta `whatsapp-sessions/user_{id}/`
- `getEstado(userId)` — estado del usuario
- `getQR(userId)` — QR del usuario
- `enviarMensaje(userId, tel, msg)` — envía desde sesión del usuario
- `enviarImagen(userId, url, caption)` — envía imagen desde sesión del usuario
- `enviarArchivoLocal(userId, path, caption)` — envía archivo desde sesión del usuario
- `enviarMixto(userId, opts)` — envía mixto desde sesión del usuario
- `getContactos(userId, q)` — contactos de la sesión del usuario
- `desconectar(userId)` — destruye solo esa sesión
- `limpiarInactivas()` — cierra sesiones sin actividad >24h
- `getSesionesActivas()` — admin: lista todas las sesiones
- `MAX_SESSIONS = 15` — límite configurable

### 3. Backend — `api/src/routes/whatsapp.js` (modificado)

| Endpoint | Cambio |
|---|---|
| `GET /estado` | Estado de `req.user.id` |
| `GET /qr` | QR de `req.user.id` |
| `POST /conectar` | Crea sesión de `req.user.id` |
| `POST /desconectar` | Destruye sesión de `req.user.id` |
| `POST /enviar-texto` | Envía desde sesión de `req.user.id` |
| `POST /enviar-articulo` | Envía desde sesión de `req.user.id` |
| `POST /enviar-mixto` | Envía desde sesión de `req.user.id` |
| `GET /contactos` | Contactos de sesión de `req.user.id` |
| `GET /historial` | Sin cambios |
| `GET /sesiones` | **Nuevo** — admin ve todas las sesiones activas |

### 4. Backend — Cron de limpieza (`api/src/server.js`)

```js
const whatsappPool = require('./services/whatsappPool');
setInterval(() => whatsappPool.limpiarInactivas(), 6 * 60 * 60 * 1000);
```

### 5. Frontend — `WhatsAppScreen.jsx` (modificado)

- Solo muestra estado del usuario actual
- Si no tiene sesión → "Vincula tu WhatsApp"
- Botón "Conectar mi WhatsApp" → genera QR personal
- Admin ve panel de sesiones activas (quién conectado, quién no)

### 6. Frontend — `WhatsAppModal.jsx` (sin cambios significativos)

- Ya usa el token del usuario, el backend rutea a la sesión correcta

## Estructura de carpetas de sesiones

```
api/
├── whatsapp-sessions/
│   ├── user_1/    ← Sesión del vendedor 1
│   │   ├── Default/
│   │   └── ...
│   ├── user_2/    ← Sesión del vendedor 2
│   └── ...
```

## Flujo del usuario

1. **Primer uso**: El vendedor entra a WhatsApp → ve "No tienes sesión vinculada"
2. **Vincular**: Hace click en "Conectar mi WhatsApp"
3. **QR**: Aparece su QR personal → lo escanea con su celular
4. **Listo**: Se muestra "Conectado: Juan Pérez (+51999123456)"
5. **Envío**: Cada mensaje sale desde **su número personal**
6. **Reconexión**: Si se desconecta, vuelve a escanear QR

## Orden de implementación

| Paso | Archivo | Acción |
|---|---|---|
| 1 | `sql/09_whatsapp_sesiones.sql` | Nueva tabla |
| 2 | `api/src/services/whatsappPool.js` | Nuevo pool de sesiones |
| 3 | `api/src/routes/whatsapp.js` | Adaptar rutas a pool |
| 4 | `api/src/server.js` | Cron de limpieza |
| 5 | `web/src/screens/WhatsAppScreen.jsx` | UI multi-usuario |
| 6 | `web/src/components/WhatsAppModal.jsx` | Adaptar envíos |
| 7 | Build + deploy | Web + API + SQL |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| RAM agotada si todos conectan | Límite MAX_SESSIONS=15, sesiones inactivas se cierran |
| Puppeteer crash | Restart automático por sesión, no afecta a otros usuarios |
| QR expirado | Polling cada 3s, usuario ve "QR expirado, regenerar" |
| Multi-dispositivo de WhatsApp | whatsapp-web.js soporta multi-device nativamente |

## Preguntas pendientes

- ¿Cuántos vendedores activos usarán WhatsApp? → 10-15
- ¿El servidor actual (16 GB RAM) es suficiente? → Sí
- ¿Los vendedores acceden desde navegador o móvil? → Ambos
