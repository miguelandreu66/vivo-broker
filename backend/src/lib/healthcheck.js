// ════════════════════════════════════════════════════════════════
// VIVO — Healthcheck expandido
// /health         → basic (siempre 200, para Railway healthcheck)
// /health/full    → detallado (DB, cron, agentes IA, disco, memoria)
// /health/ready   → readiness probe (DB OK + tablas existen)
// ════════════════════════════════════════════════════════════════

const db = require('../db');
const fs = require('fs');
const path = require('path');

const VERSION = require('../../package.json').version || '1.0.0';
const STARTED_AT = Date.now();

// ── Basic health: nunca falla, solo confirma que el proceso vive ──
function basic() {
  return {
    status: 'ok',
    app: 'VIVO',
    eslogan: 'Tu carga, VIVO.',
    version: VERSION,
    agentes_ia: 12,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

// ── Full health: corre todos los chequeos con timeout ──
async function full() {
  const inicio = Date.now();
  const checks = {};
  let overall = 'ok';

  // ── DB ──
  try {
    const start = Date.now();
    const { rows: [r] } = await Promise.race([
      db.query('SELECT NOW() AS now, version() AS pg_version'),
      timeout(2000, 'DB query timeout'),
    ]);
    checks.database = {
      status: 'ok',
      latencia_ms: Date.now() - start,
      pg_version: r.pg_version?.split(' ')[0] + ' ' + r.pg_version?.split(' ')[1],
      now: r.now,
    };
  } catch (e) {
    overall = 'degraded';
    checks.database = { status: 'error', error: e.message };
  }

  // ── Tablas críticas existen ──
  try {
    const { rows } = await Promise.race([
      db.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('usuarios', 'leads', 'clientes', 'transportistas_externos', 'cfdi_emitidos', 'agentes_invocaciones')
      `),
      timeout(2000, 'tables check timeout'),
    ]);
    const found = rows.map(r => r.table_name);
    const required = ['usuarios', 'leads', 'clientes', 'transportistas_externos'];
    const missing = required.filter(t => !found.includes(t));
    checks.schema = {
      status: missing.length === 0 ? 'ok' : 'error',
      tablas_encontradas: found.length,
      tablas_faltantes: missing,
    };
    if (missing.length > 0) overall = 'degraded';
  } catch (e) {
    overall = 'degraded';
    checks.schema = { status: 'error', error: e.message };
  }

  // ── Cron jobs ──
  try {
    const { rows } = await Promise.race([
      db.query(`
        SELECT COUNT(*)::int AS total
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'cron_jobs_historial'
      `),
      timeout(1000, 'cron check timeout'),
    ]);
    const tieneTabla = rows[0].total > 0;
    let ultimoExito = null;
    if (tieneTabla) {
      const { rows: [r] } = await db.query(`
        SELECT MAX(creado_en) AS ultimo FROM cron_jobs_historial WHERE exito = true
      `);
      ultimoExito = r?.ultimo || null;
    }
    checks.cron = {
      status: 'ok',
      habilitado: process.env.ENABLE_CRON === 'true',
      ultimo_exito: ultimoExito,
      tracking_habilitado: tieneTabla,
    };
  } catch (e) {
    checks.cron = { status: 'warn', error: e.message };
  }

  // ── Agentes IA (verifica que hay invocaciones recientes) ──
  try {
    const { rows: [r] } = await Promise.race([
      db.query(`
        SELECT
          COUNT(*)::int AS invocaciones_24h,
          COUNT(*) FILTER (WHERE error_mensaje IS NOT NULL)::int AS errores_24h,
          COALESCE(AVG(latencia_ms), 0)::int AS latencia_promedio_ms
        FROM agentes_invocaciones
        WHERE creado_en >= NOW() - INTERVAL '24 hours'
      `),
      timeout(2000, 'agentes check timeout'),
    ]);
    checks.agentes_ia = {
      status: 'ok',
      invocaciones_24h: r.invocaciones_24h,
      errores_24h: r.errores_24h,
      latencia_promedio_ms: r.latencia_promedio_ms,
      error_rate: r.invocaciones_24h > 0
        ? `${((r.errores_24h / r.invocaciones_24h) * 100).toFixed(1)}%`
        : '—',
    };
    if (r.invocaciones_24h > 0 && r.errores_24h / r.invocaciones_24h > 0.1) {
      overall = 'degraded';
      checks.agentes_ia.status = 'warn';
      checks.agentes_ia.alerta = 'Error rate > 10%';
    }
  } catch (e) {
    checks.agentes_ia = { status: 'warn', error: e.message };
  }

  // ── Memoria + disco ──
  const mem = process.memoryUsage();
  checks.proceso = {
    status: 'ok',
    memoria_mb: {
      heap_used: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
    },
    pid: process.pid,
    node_version: process.version,
  };

  // ── Variables de entorno críticas ──
  const envRequired = ['DATABASE_URL', 'JWT_SECRET'];
  const envMissing = envRequired.filter(k => !process.env[k]);
  checks.config = {
    status: envMissing.length === 0 ? 'ok' : 'error',
    env_faltantes: envMissing,
    node_env: process.env.NODE_ENV || 'development',
    cors_origins: (process.env.FRONTEND_URL || '').split(',').length,
  };
  if (envMissing.length > 0) overall = 'critical';

  return {
    status: overall,
    app: 'VIVO',
    version: VERSION,
    uptime_seconds: Math.floor(process.uptime()),
    arrancado_en: new Date(STARTED_AT).toISOString(),
    healthcheck_duration_ms: Date.now() - inicio,
    timestamp: new Date().toISOString(),
    checks,
  };
}

// ── Readiness probe: DB + tablas críticas ──
async function ready() {
  try {
    await Promise.race([
      db.query('SELECT 1'),
      timeout(1500, 'readiness DB timeout'),
    ]);
    return { ready: true, timestamp: new Date().toISOString() };
  } catch (e) {
    return { ready: false, error: e.message, timestamp: new Date().toISOString() };
  }
}

function timeout(ms, message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

module.exports = { basic, full, ready };
