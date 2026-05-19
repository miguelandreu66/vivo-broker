// ════════════════════════════════════════════════════════════════
// VIVO — Middleware de seguridad
// ════════════════════════════════════════════════════════════════
// Helmet (headers), CORS estricto, rate limiting por endpoint.
// ════════════════════════════════════════════════════════════════

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// ── Helmet con config razonable ────────────────────
const helmetMiddleware = helmet({
  contentSecurityPolicy: false,  // muy estricto para SPA + API mixed
  crossOriginEmbedderPolicy: false,
});

// ── CORS estricto: solo orígenes configurados ───────
function corsConfig() {
  const allowed = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .split(',').map(s => s.trim()).filter(Boolean);

  return {
    origin: (origin, callback) => {
      // Permitir sin origin (Postman, curl)
      if (!origin) return callback(null, true);
      if (allowed.includes(origin) || allowed.includes('*')) return callback(null, true);
      callback(new Error(`Origen no permitido: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  };
}

// ── Rate limiters ──────────────────────────────────
// Login: 5 intentos por 15 min
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de login. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Cotizador público: 10 cotizaciones por hora por IP
const cotizadorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Has cotizado demasiadas veces en la última hora. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: 200 requests por minuto por IP (para endpoints autenticados)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Rate limit excedido. Espera un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Agentes IA: 30 conversaciones por minuto por IP (controla gasto)
const agentesIaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas consultas a agentes IA. Espera un minuto.' },
});

module.exports = {
  helmetMiddleware,
  corsConfig,
  loginLimiter,
  cotizadorLimiter,
  apiLimiter,
  agentesIaLimiter,
};
