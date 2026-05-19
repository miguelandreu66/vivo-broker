// ════════════════════════════════════════════════════════════════
// VIVO — Tracking de visitas (UTMs + atribución de canales)
// ════════════════════════════════════════════════════════════════
// Registra cada visita anónima al cotizador público con UTMs,
// referrer, user agent. Después se cruza con leads_cotizados para
// medir ROI por canal.
// ════════════════════════════════════════════════════════════════

const db = require('../../db');

async function registrarVisita({ sessionId, ip, userAgent, evento, utms = {}, referrer, landingPath }) {
  try {
    const { rows: [r] } = await db.query(`
      INSERT INTO marketing_visitas
        (session_id, ip, user_agent, evento,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term,
         referrer, landing_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      sessionId || null,
      ip || null,
      (userAgent || '').slice(0, 500),
      evento || 'visita',
      utms.utm_source || null,
      utms.utm_medium || null,
      utms.utm_campaign || null,
      utms.utm_content || null,
      utms.utm_term || null,
      referrer || null,
      (landingPath || '').slice(0, 300),
    ]);
    return r?.id || null;
  } catch (e) {
    // Si la tabla no existe (DB sin marketing schema), fallar silencioso
    if (e.code === '42P01') return null;
    console.warn('[tracking] registrarVisita:', e.message);
    return null;
  }
}

async function consultarROIPorCanal(diasAtras = 30) {
  try {
    const { rows } = await db.query(`
      SELECT * FROM marketing_funnel_canal
      WHERE periodo >= CURRENT_DATE - $1::int * INTERVAL '1 day'
      LIMIT 100
    `, [diasAtras]);
    return rows;
  } catch (e) {
    if (e.code === '42P01') return [];
    throw e;
  }
}

module.exports = { registrarVisita, consultarROIPorCanal };
