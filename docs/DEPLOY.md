# 🚀 Deploy VIVO en Railway

## Pre-requisitos
- Cuenta Railway (https://railway.app)
- Cuenta Anthropic con créditos (https://console.anthropic.com)
- Cuenta Twilio (sandbox gratis para empezar)
- Cuenta SendGrid (free tier 100 emails/día)
- Cuenta Facturama (sandbox gratis)
- Dominio (opcional pero recomendado: vivocargo.com)

## Pasos

### 1. Crear proyecto en Railway

```
1. Entra a https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Selecciona: miguelandreu66/vivo-broker
4. Railway detecta auto el monorepo
```

### 2. Agregar PostgreSQL al proyecto

```
1. Dentro del proyecto Railway → Click "+ New"
2. Database → PostgreSQL
3. Espera 1 min a que arranque
4. Copia DATABASE_URL desde Variables
```

### 3. Aplicar migration inicial

Localmente:
```bash
psql "$DATABASE_URL" -f migrations/001_vivo_schema_inicial.sql
```

O desde Railway CLI:
```bash
railway run psql "$DATABASE_URL" -f migrations/001_vivo_schema_inicial.sql
```

### 4. Configurar servicios en Railway

**Backend** (Node service):
- Root directory: `/backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  ```
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  JWT_SECRET=<genera random 64 chars>
  PORT=4000
  FRONTEND_URL=https://vivo-frontend.up.railway.app
  BACKEND_URL=https://vivo-backend.up.railway.app
  ```

**Frontend** (Node service):
- Root directory: `/frontend`
- Build command: `npm install && npm run build`
- Start command: `npx serve -s build -l $PORT`
- Environment variables:
  ```
  REACT_APP_API_URL=https://vivo-backend.up.railway.app/api
  ```

### 5. Configurar dominios

```
Backend: api.vivocargo.com → Railway public domain
Frontend: vivocargo.com → Railway public domain
```

### 6. Configurar BYOK (API Keys) desde la app

Una vez deployado, login como director:
- Email: miguel@vivocargo.com
- Password: cambiar_inmediatamente

Cambia la contraseña inmediatamente desde `/configuracion`.

Después agrega las API keys en `/configuracion → API Keys`:

| Clave | Dónde la consigues |
|---|---|
| `anthropic_api_key` | https://console.anthropic.com/settings/keys |
| `twilio_account_sid` | https://console.twilio.com (Account info) |
| `twilio_auth_token` | https://console.twilio.com (Account info) |
| `twilio_whatsapp_from` | Sandbox: `whatsapp:+14155238886` |
| `sendgrid_api_key` | https://app.sendgrid.com/settings/api_keys |
| `sendgrid_from_email` | El verificado en SendGrid |
| `sendgrid_from_name` | "VIVO — Ventas" |
| `facturama_username` | https://facturama.mx (panel) |
| `facturama_password` | mismo panel |
| `mapbox_public_token` | https://account.mapbox.com/access-tokens |

### 7. Configurar webhooks externos

**Twilio (WhatsApp inbound):**
- En Twilio Console → Messaging → WhatsApp Sandbox
- "When a message comes in" → `https://api.vivocargo.com/api/canales/whatsapp/incoming`
- Method: POST
- "Status callback URL" → `https://api.vivocargo.com/api/canales/whatsapp/status`

**SendGrid (event webhook):**
- En SendGrid → Settings → Mail Settings → Event Webhook
- HTTP Post URL → `https://api.vivocargo.com/api/canales/email/events`
- Activa: Delivered, Opened, Clicked, Bounced

### 8. Verificar deploy

Abre:
- https://vivocargo.com → debes ver login VIVO con logo naranja/negro
- https://api.vivocargo.com/health → debe responder `{ status: "ok", app: "VIVO", agentes_ia: 12 }`

### 9. Test E2E

1. Ve a https://vivocargo.com/cotizar (público, sin login)
2. Llena formulario con tu email/teléfono
3. Cotiza
4. Confirma que recibes email (si SendGrid configurado)
5. Login como director
6. Ve el lead en `/leads`
7. Conversa con el CEO IA en `/agentes/ceo`
