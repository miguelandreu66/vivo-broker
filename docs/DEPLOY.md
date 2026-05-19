# 🚀 Deploy VIVO en Railway

Guía paso a paso para llevar VIVO de localhost a producción.

---

## 📋 Pre-requisitos (10 min)

| # | Qué necesitas | Dónde lo consigues | Costo |
|---|---|---|---|
| 1 | Cuenta Railway | https://railway.com (login con GitHub) | $5 USD/mes |
| 2 | Cuenta Anthropic | https://console.anthropic.com | $5 USD crédito inicial |
| 3 | (Opcional) Dominio | Cloudflare / Namecheap | ~$150 MXN/año |
| 4 | (Opcional) Twilio | https://twilio.com | Sandbox gratis |
| 5 | (Opcional) SendGrid | https://sendgrid.com | 100 emails/día gratis |
| 6 | (Opcional) Facturama | https://facturama.mx | Sandbox gratis |
| 7 | (Opcional) Mapbox | https://mapbox.com | 50k requests gratis |

**Sin opcionales VIVO ya jala** — los agentes IA conversan, leads se capturan, base de datos funciona. Lo demás se agrega cuando lo necesites.

---

## 1️⃣ Crear proyecto en Railway

1. Abre **https://railway.com/new**
2. Click **"Deploy from GitHub repo"** → autoriza GitHub si te pide
3. Selecciona **`miguelandreu66/vivo-broker`**
4. Railway crea el proyecto (NO deployes todavía)

---

## 2️⃣ Agregar PostgreSQL

1. Dentro del proyecto → **`+ Create`** → **Database** → **Add PostgreSQL**
2. Espera 30 segundos
3. (Opcional) Renómbralo a `vivo-db` para distinguirlo

✅ Tendrás un Postgres listo con `DATABASE_URL` lista para conectar.

---

## 3️⃣ Configurar servicio BACKEND

Si Railway no creó el servicio backend automáticamente:

1. **`+ Create`** → **GitHub Repo** → selecciona `vivo-broker`
2. Una vez creado, abre el servicio → tab **Settings**
3. En **Source** configura:
   - **Root Directory**: `backend`
   - Railway leerá automáticamente `backend/railway.json`
4. En tab **Variables**, agrega estas:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}    # link al Postgres del proyecto
JWT_SECRET=                                 # ← pega 64 chars aleatorios (ver abajo)
NODE_ENV=production
PORT=4000
ENABLE_CRON=true
FRONTEND_URL=https://vivo-frontend.up.railway.app   # ajusta tras paso 4
BACKEND_URL=https://vivo-backend.up.railway.app     # ajusta tras paso 4
```

**Para generar JWT_SECRET** (en tu Mac):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

5. Click **Deploy** → Railway empieza a buildear.
6. Cuando termine, en tab **Settings → Networking** click **"Generate Domain"** — Railway te da una URL tipo `https://vivo-backend-production.up.railway.app`.

**Las migrations corren automáticamente** al arrancar (configurado en `railway.json`: `npm run migrate && npm start`). En logs verás:
```
✅ 001_vivo_schema_inicial.sql aplicada
✅ 002_marketing_tracking.sql aplicada
⚡ VIVO Backend corriendo en puerto 4000
```

✅ Verifica: abre `https://<tu-backend>.up.railway.app/health` — debe responder:
```json
{ "status": "ok", "app": "VIVO", "agentes_ia": 12 }
```

---

## 4️⃣ Configurar servicio FRONTEND

1. En el mismo proyecto Railway → **`+ Create`** → **GitHub Repo** → selecciona otra vez `vivo-broker`
2. Abre el nuevo servicio → tab **Settings**:
   - **Root Directory**: `frontend`
3. En tab **Variables**:

```bash
REACT_APP_API_URL=https://<tu-backend>.up.railway.app/api
```

(usa el dominio que generaste en paso 3)

4. Click **Deploy**. Railway buildea con `npm run build` y sirve con `serve -s build`.
5. Cuando termine, **Settings → Networking → Generate Domain**.

6. **Vuelve al backend** → Variables → actualiza `FRONTEND_URL` con la URL que te dio Railway para el frontend.

✅ Verifica: abre la URL del frontend en navegador. Debes ver el **login VIVO** con gradient naranja/dorado.

---

## 5️⃣ Crear tu usuario admin

Por defecto el seed crea **miguel@vivocargo.com** con password `vivo2026`. Para arrancar en producción tienes 2 opciones:

### Opción A — Correr el seed demo (recomendado para empezar)
En Railway → backend service → tab **Settings → Deploy → Custom Start Command** (temporalmente):
```bash
npm run migrate && node scripts/seed-demo.js && npm start
```
Hace deploy una vez, luego **regresa el start command original** (`npm run migrate && npm start`).

Te crea: 1 usuario director + 5 clientes ficticios + 5 transportistas + 4 leads de demo.

### Opción B — Crear el usuario manualmente
Conéctate al Postgres desde tu Mac (Railway → Postgres → tab **Data** o **Query Runner**) y corre:

```sql
INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
VALUES (
  'Miguel Cantoran',
  'miguel@vivocargo.com',
  '$2a$10$XXXX',  -- bcrypt hash de tu password
  'director',
  true
);
```

Para generar el hash, en tu Mac:
```bash
cd /Users/MIGUEL/Downloads/vivo-broker/backend
node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD_AQUI', 10))"
```

---

## 6️⃣ Primer login + onboarding

1. Abre la URL del frontend
2. Login con `miguel@vivocargo.com` / `vivo2026` (o la que pusiste)
3. **Te redirige automáticamente a `/onboarding`** (wizard de 5 pasos):
   - Paso 1: Bienvenida
   - Paso 2: **Cambiar password** (obligado a uno distinto de `vivo2026`)
   - Paso 3: **Pegar Anthropic API key** (la del paso 7)
   - Paso 4: Datos fiscales (RFC, razón social, CP)
   - Paso 5: Listo

---

## 7️⃣ API Keys (BYOK)

Tras el onboarding ya tienes Anthropic configurada. Para el resto, ve a **`/configuracion`** y agrega:

| Clave | Dónde la consigues |
|---|---|
| `anthropic_api_key` | https://console.anthropic.com/settings/keys (sk-ant-...) |
| `twilio_account_sid` | https://console.twilio.com (Account Info → SID) |
| `twilio_auth_token` | https://console.twilio.com (Account Info → Auth Token) |
| `twilio_whatsapp_from` | Sandbox: `whatsapp:+14155238886` |
| `sendgrid_api_key` | https://app.sendgrid.com/settings/api_keys |
| `sendgrid_from_email` | El verificado en SendGrid |
| `sendgrid_from_name` | "VIVO — Ventas" |
| `facturama_username` | https://facturama.mx (Panel) |
| `facturama_password` | mismo panel |
| `mapbox_public_token` | https://account.mapbox.com/access-tokens (pk...) |

---

## 8️⃣ (Opcional) Dominio propio

Si compras `vivocargo.com`:

### En Cloudflare/Namecheap
Crea estos registros DNS:
```
A      api      → IP que Railway te dé
CNAME  www      → tu-frontend.up.railway.app
CNAME  @        → tu-frontend.up.railway.app  (o usa redirect a www)
```

### En Railway
- Backend → **Settings → Networking → Custom Domain** → `api.vivocargo.com`
- Frontend → **Settings → Networking → Custom Domain** → `vivocargo.com` y `www.vivocargo.com`

Railway emite SSL automático (Let's Encrypt) en ~5 min.

### Actualiza variables
- Backend → `FRONTEND_URL=https://vivocargo.com`
- Backend → `BACKEND_URL=https://api.vivocargo.com`
- Frontend → `REACT_APP_API_URL=https://api.vivocargo.com/api`

Redeploy ambos servicios.

---

## 9️⃣ Webhooks externos (cuando uses Twilio / SendGrid)

**Twilio (WhatsApp inbound):**
- Twilio Console → Messaging → WhatsApp Sandbox (o Senders en producción)
- **When a message comes in** → `https://api.vivocargo.com/api/canales/whatsapp/incoming` (POST)
- **Status callback URL** → `https://api.vivocargo.com/api/canales/whatsapp/status`

**SendGrid (Event Webhook):**
- SendGrid → Settings → Mail Settings → Event Webhook
- **HTTP Post URL** → `https://api.vivocargo.com/api/canales/email/events`
- Activa eventos: Delivered, Opened, Clicked, Bounced, Spam Report

---

## ✅ Verificación E2E

1. ✅ `https://api.vivocargo.com/health` → `{ status: "ok", agentes_ia: 12 }`
2. ✅ `https://vivocargo.com` → login VIVO con gradient
3. ✅ Login → te lleva a onboarding wizard
4. ✅ Completar wizard → llegas al dashboard
5. ✅ `/agentes/ceo` → conversación con CEO IA responde (requiere Anthropic key)
6. ✅ `/cotizar` (público) → llenas formulario → recibes cotización en pantalla
7. ✅ Como director ves el lead nuevo en `/leads`
8. ✅ `/costos-ia` → muestra el gasto de la conversación con CEO IA

---

## 🆘 Troubleshooting común

| Error | Causa | Fix |
|---|---|---|
| `self-signed certificate in certificate chain` | Backend no detecta que Railway requiere SSL | Verifica `DATABASE_URL` no tiene `?sslmode=require` Y que apunta a `*.rlwy.net` |
| `Origen no permitido por CORS` | `FRONTEND_URL` env mal configurada | En backend Variables, asegura que `FRONTEND_URL` sea la URL exacta del frontend deployado |
| Frontend en blanco | Build OK pero `REACT_APP_API_URL` apunta a localhost | Verifica la variable en el frontend service, redeploy |
| Cron jobs no corren | `ENABLE_CRON` ausente o `false` | Backend Variables → `ENABLE_CRON=true` → redeploy |
| 502 Bad Gateway | Backend crasheó al arrancar | Railway logs → ve el stack trace, usualmente es una env var faltante o migration fallida |

---

## 💸 Costo estimado mensual (Railway free → starter)

| Servicio | Hobby Plan | Pro Plan |
|---|---|---|
| Postgres (1GB) | $5 | $5 |
| Backend (Hobby) | $5 | $5 |
| Frontend (Hobby) | $5 | $5 |
| **Total Railway** | **~$15 USD** | ~$15 USD |
| Anthropic (uso variable) | $5-50 | depende |
| Dominio | $1 | $1 |
| **Total mensual** | **$21-66 USD** | $21-66 USD |

≈ **$370 - $1,200 MXN/mes** según uso de IA. Con 10 cotizaciones/día y 50 mensajes/día a agentes IA está en el rango bajo (~$30 USD/mes).
