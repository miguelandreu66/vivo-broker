// ════════════════════════════════════════════════════════════════
// VIVO — Brokerage de Urgencias Logísticas
// "Tu carga, VIVO."
// ════════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));

// Routes core
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/configuracion'));  // monta /auth/api-keys/*
app.use('/api/configuracion', require('./routes/configuracion'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/leads', require('./routes/leads'));

// Routes broker
app.use('/api/transportistas', require('./routes/transportistaDocumentos'));
app.use('/api/transportistas', require('./routes/transportistas'));
app.use('/api/broker-finanzas', require('./routes/brokerFinanzas'));

// Routes IA
app.use('/api/agentes', require('./routes/agentes'));
app.use('/api/vendedor-ia', require('./routes/vendedorIA'));
app.use('/api/asignador-ia', require('./routes/asignadorIA'));
app.use('/api/retencion-ia', require('./routes/retencionIA'));
app.use('/api/atraccion-ia', require('./routes/atraccionIA'));
app.use('/api/auditor-ia', require('./routes/auditorIA'));

// Routes canales (webhooks Twilio / SendGrid)
app.use('/api/canales', require('./routes/canales'));

// Routes fiscal
app.use('/api/cfdi', require('./routes/cfdi'));

app.get('/health', (req, res) => res.json({
  status: 'ok',
  app: 'VIVO',
  eslogan: 'Tu carga, VIVO.',
  agentes_ia: 12,
}));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`⚡ VIVO Backend corriendo en puerto ${PORT}`);
  console.log(`   Tu carga, VIVO.`);
});
