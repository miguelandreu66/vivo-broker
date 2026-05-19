// ════════════════════════════════════════════════════════════════
// VIVO — Brokerage de Urgencias Logísticas
// "Tu carga, VIVO."
// ════════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  helmetMiddleware, corsConfig,
  loginLimiter, cotizadorLimiter, apiLimiter, agentesIaLimiter,
} = require('./lib/seguridad');

const app = express();

// Confiar en proxy de Railway/Heroku para detectar IP real
app.set('trust proxy', 1);

// Seguridad
app.use(helmetMiddleware);
app.use(cors(corsConfig()));
app.use(express.json({ limit: '10mb' }));

// ── Rate limiters específicos en endpoints sensibles ──
app.use('/api/auth/login', loginLimiter);
app.use('/api/leads/cotizar', cotizadorLimiter);
app.use('/api/agentes', agentesIaLimiter);
// Limiter general para el resto
app.use('/api', apiLimiter);

// ── Routes core ────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/configuracion'));  // /auth/api-keys/*
app.use('/api/configuracion', require('./routes/configuracion'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/leads', require('./routes/leads'));

// ── Routes broker ──────────────────────────────────
app.use('/api/transportistas', require('./routes/transportistaDocumentos'));
app.use('/api/transportistas', require('./routes/transportistas'));
app.use('/api/broker-finanzas', require('./routes/brokerFinanzas'));

// ── Routes IA ──────────────────────────────────────
app.use('/api/agentes', require('./routes/agentes'));
app.use('/api/vendedor-ia', require('./routes/vendedorIA'));
app.use('/api/asignador-ia', require('./routes/asignadorIA'));
app.use('/api/retencion-ia', require('./routes/retencionIA'));
app.use('/api/atraccion-ia', require('./routes/atraccionIA'));
app.use('/api/auditor-ia', require('./routes/auditorIA'));

// ── Webhooks externos (Twilio / SendGrid) ──────────
app.use('/api/canales', require('./routes/canales'));

// ── Routes fiscal ──────────────────────────────────
app.use('/api/cfdi', require('./routes/cfdi'));

// ── Healthchecks ────────────────────────────────────
const health = require('./lib/healthcheck');
app.get('/health',      (req, res) => res.json(health.basic()));   // siempre 200, Railway healthcheck
app.get('/health/full', async (req, res) => {
  const r = await health.full();
  res.status(r.status === 'critical' ? 503 : 200).json(r);
});
app.get('/health/ready', async (req, res) => {
  const r = await health.ready();
  res.status(r.ready ? 200 : 503).json(r);
});

// Handler global de errores (último recurso)
app.use((err, req, res, _next) => {
  if (err.message?.includes('Origen no permitido')) {
    return res.status(403).json({ error: 'CORS bloqueado' });
  }
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`⚡ VIVO Backend corriendo en puerto ${PORT}`);
  console.log(`   Tu carga, VIVO.`);
  try {
    require('./lib/cronJobs').iniciar();
  } catch (e) {
    console.warn('[CRON] no iniciado:', e.message);
  }
});
