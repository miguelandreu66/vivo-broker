# ⚡ VIVO

**Tu carga, VIVO.**

Brokerage de urgencias logísticas con 12 agentes IA. Hecho en México para LATAM.

---

## 🎯 Qué es VIVO

VIVO es un sistema autopilot que opera un negocio de **brokerage de urgencias logísticas**. NO operamos camiones propios. Conectamos clientes que necesitan mover carga urgente con transportistas verificados, y nos quedamos con la comisión.

**Modelo de negocio:**
- Cliente paga PREMIUM por velocidad (1.5x a 3x precio normal)
- 50% SPEI anticipado obligatorio + 50% contra entrega
- Tiers: CRITICAL (3x, 4-6h) · EXPRESS (2x, mismo día) · URGENT (1.5x, next day)
- Comisión típica VIVO: 35-45% del precio cliente

---

## 🤖 Los 12 Agentes IA

| # | Agente | Modelo | Rol |
|---|---|---|---|
| 1 | 👑 CEO IA | Opus 4.7 | Estratega: dashboard, OKRs, pricing, capital |
| 2 | 🤖 Vendedor IA 24/7 | Sonnet 4.6 | Cierre de leads vía WhatsApp + Email |
| 3 | 🤝 Negociador IA | Sonnet 4.6 | Regateo dinámico clientes/transportistas |
| 4 | 🎯 Asignador IA | Haiku 4.5 | Match óptimo broker (subasta inversa) |
| 5 | 💸 CFO IA | Opus 4.7 | Cashflow watchdog, exposición, proyecciones |
| 6 | ⚖️ Abogado IA | Opus 4.7 | Contratos, compliance, disputas, liability |
| 7 | 📊 Contador IA | Opus 4.7 | CFDI, ISR, IVA, declaraciones SAT |
| 8 | 🔍 Reclutador IA | Sonnet 4.6 | Onboarding y verificación transportistas |
| 9 | 🚀 Atracción IA | Sonnet 4.6 | Marketing contenido (LinkedIn, blog, ads) |
| 10 | 🔄 Retención IA | Haiku 4.5 | Recuperación de clientes inactivos |
| 11 | 🚨 Disputas IA | Opus 4.7 | Resolución de quejas con criterio jurídico |
| 12 | 📡 Reputación IA | Haiku 4.5 | Monitoreo redes + respuesta reseñas |

---

## 🏗️ Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React (CRA) + React Router
- **IA**: Claude API (Opus 4.7, Sonnet 4.6, Haiku 4.5)
- **WhatsApp**: Twilio
- **Email**: SendGrid
- **PAC**: Facturama (CFDI 4.0 + Carta Porte 3.0)
- **Hosting**: Railway
- **Mapas**: Mapbox

---

## 🚀 Setup

### 1. Variables de entorno

Backend `.env`:
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=4000
FRONTEND_URL=https://vivocargo.com
ANTHROPIC_API_KEY=...  # opcional, mejor usar BYOK
BACKEND_URL=https://api.vivocargo.com
```

Frontend `.env`:
```
REACT_APP_API_URL=https://api.vivocargo.com/api
```

### 2. Base de datos

```bash
cd backend
psql $DATABASE_URL -f ../migrations/001_vivo_schema_inicial.sql
```

### 3. Instalar dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Configurar BYOK (Bring Your Own Keys)

En `/configuracion → API Keys` agregar:
- `anthropic_api_key` (sk-ant-...)
- `twilio_account_sid` + `twilio_auth_token` + `twilio_whatsapp_from`
- `sendgrid_api_key` + `sendgrid_from_email` + `sendgrid_from_name`
- `facturama_username` + `facturama_password`
- `mapbox_public_token`

### 5. Arrancar

```bash
cd backend && npm run dev
cd frontend && npm start
```

---

## 📡 API endpoints clave

### Agentes IA (acceso unificado)
```
GET    /api/agentes                       Lista de 12 agentes
GET    /api/agentes/:nombre               Detalle de un agente
POST   /api/agentes/:nombre/conversar     Invocar al agente
GET    /api/agentes/historial/invocaciones  Auditoría
GET    /api/agentes/historial/costos       Costos por agente
```

### Cotizador público
```
POST   /api/leads/cotizar                 Cotización pública (cliente)
GET    /api/leads/pdf/:folio              PDF público con folio
```

### Broker
```
GET/POST /api/transportistas              CRUD red transportistas
PUT    /api/transportistas/:id/verificar  Aprobar verificación
POST   /api/leads/:id/asignar-transportista  Asignar (con bloqueos)
GET    /api/broker-finanzas/dashboard     Cashflow + concentración
```

---

## 💰 Costos operativos estimados

| Concepto | $/mes USD |
|---|---:|
| Railway (backend + DB) | $15-30 |
| Anthropic (12 agentes uso real) | $50-150 |
| Twilio WhatsApp (~500 msgs) | $5-15 |
| SendGrid (free hasta 100/día) | $0-20 |
| Facturama (productivo) | $0 fijo + $1/timbre |
| Mapbox | $5-15 |
| Dominio + SSL | $1 |
| **TOTAL** | **$75-230 USD/mes** |

Para arrancar (sandbox + free tiers): **~$25 USD/mes**.

---

## 🎯 Roadmap

- [x] Schema DB inicial
- [x] 12 agentes con system prompts
- [x] Orchestrator + tools
- [ ] Frontend rediseñado con branding VIVO (naranja/negro)
- [ ] Deploy en Railway
- [ ] Dominio vivocargo.com
- [ ] Onboarding video del director
- [ ] Manual operativo de administradora
- [ ] Marketing inicial

---

## 📜 Licencia

Propietario · Miguel Cantoran Andreu · 2026

**Tu carga, VIVO.**
