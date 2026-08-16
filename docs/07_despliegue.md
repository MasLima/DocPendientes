# 07 — Despliegue automático con GitHub Actions

El repositorio incluye un workflow de GitHub Actions
(`.github/workflows/deploy.yml`) que se ejecuta al hacer `push` a la rama
`main`. Su propósito: **compilar, verificar y desplegar automáticamente** la
app (web + API) al servidor de producción.

## Qué hace el workflow hoy

| Paso | Descripción |
|---|---|
| `build` | Instala dependencias (API y app), verifica que la API arranca (smoke test con `/api/health`) y compila la versión **web** a `dist/`. Publica la web y el backend como **artefactos** descargables. |
| `deploy` | **Desactivado** hasta que definas los secretos de GitHub. Solo se ejecuta si `SSH_HOST` existe. Copia la web (scp) y la API al servidor y relanza con **PM2**. |

El workflow está **pensado para un VPS Linux** (Ubuntu/Debian) con SSH.

## Cómo activarlo (cuando tengas el servidor)

### 1. Preparar el servidor (una sola vez)

En el VPS (Ubuntu/Debian):

```bash
# Instalar Node 22, PM2 y nginx
sudo apt update && sudo apt install -y nginx git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Crear la estructura de despliegue
sudo mkdir -p /var/www/cobranza/{web,api}
sudo chown -R $USER:$USER /var/www/cobranza
```

Configurar **nginx** para servir la web (`/var/www/cobranza/web`) en el puerto
80 y **redirigir** `/api` a `localhost:3000`:

```nginx
server {
    listen 80;
    server_name api.miempresa.com;

    root /var/www/cobranza/web;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 2. Crear los secretos en GitHub

En GitHub → **Settings → Secrets and variables → Actions → New repository
secret**:

| Secreto | Valor | Ejemplo |
|---|---|---|
| `SSH_HOST` | IP o dominio del servidor | `203.0.113.10` |
| `SSH_USER` | Usuario SSH | `ubuntu` |
| `SSH_PORT` | Puerto SSH | `22` |
| `SSH_KEY` | Clave privada SSH (PEM) | (contenido de `id_ed25519`) |
| `DEPLOY_PATH` | Ruta del proyecto en el servidor | `/var/www/cobranza` |

> Generar una clave solo para despliegue (opcional pero recomendado):
> `ssh-keygen -t ed25519 -f ~/.ssh/deploy_key` y agregar `deploy_key.pub` a
> `~/.ssh/authorized_keys` del servidor.

### 3. Probar

```powershell
# en la raiz del proyecto
git push origin main
```

En GitHub → pestaña **Actions** verás el workflow ejecutándose. Al terminar:
- La web queda en `https://miempresa.com`
- La API responde en `https://miempresa.com/api/health`
- El sync con el ERP corre al desplegar (`npm run sync`)

## Despliegue manual (alternativa)

Si prefieres desplegar sin GitHub Actions:

```powershell
# 1) Web compilada
cd movil
npx expo export --platform web
# copiar movil\dist\* al servidor en /var/www/cobranza/web/

# 2) API
cd ..\api
# copiar api\ (sin node_modules) a /var/www/cobranza/api/
# en el servidor:
#   cd /var/www/cobranza/api && npm ci && npm run sync
#   pm2 start src/server.js --name cobranza-api && pm2 save
```

## Secretos en la API (producción)

El archivo `.env` **no se sube a GitHub**. En el servidor se crea a mano:

```bash
cp /var/www/cobranza/api/.env.example /var/www/cobranza/api/.env
nano /var/www/cobranza/api/.env   # llenar con valores de produccion
```

Ver `api/.env.example` para la lista de variables (BD de la app, credenciales
del ERP **solo lectura**, `JWT_SECRET`, etc.).

## Flujo completo de cambios

```
editar codigo → git commit → git push origin main
                                    │
                                    ▼
              GitHub Actions (build + deploy automático)
                                    │
                                    ▼
            servidor de produccion (web + API + sync ERP)
```

## Notas

- El paso `deploy` está condicionado a que exista `SSH_HOST`; si no existe,
  el workflow **igual compila y deja artefactos** en Actions.
- El workflow hace `git pull` en el servidor para la API; por eso el servidor
  necesita acceso de **solo lectura** al repositorio (o usar el artefacto
  `api-src` y reemplazar los archivos con scp).
- Si el ERP no es accesible desde el servidor de despliegue, quitar
  `npm run sync` de la línea de despliegue y programarlo por separado
  (ver `05_produccion.md`).