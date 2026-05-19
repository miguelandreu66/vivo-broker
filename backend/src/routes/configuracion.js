// ════════════════════════════════════════════════════════════════
// VIVO — Configuración (BYOK API Keys + parámetros generales)
// ════════════════════════════════════════════════════════════════

const router = require('express').Router();
const auth = require('../middleware/auth');
const apiKeys = require('../lib/agents/apiKeysStore');
const db = require('../db');

const ROLES_DIRECTIVOS = ['director', 'admin'];

// ── API Keys (BYOK) ───────────────────────────────
router.get('/api-keys', auth(ROLES_DIRECTIVOS), async (_req, res) => {
  try {
    const disponibilidad = await apiKeys.disponibilidad();
    res.json(disponibilidad);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api-keys/:clave', auth(ROLES_DIRECTIVOS), async (req, res) => {
  const { valor } = req.body || {};
  if (!valor) return res.status(400).json({ error: 'valor requerido' });
  try {
    await apiKeys.guardar(req.params.clave, valor, req.usuario.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/api-keys/:clave', auth(ROLES_DIRECTIVOS), async (req, res) => {
  try {
    await apiKeys.eliminar(req.params.clave, req.usuario.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Probar API key (consulta a Anthropic o servicio) ──
router.post('/api-keys/:clave/probar', auth(ROLES_DIRECTIVOS), async (req, res) => {
  const { valor } = req.body || {};
  try {
    if (req.params.clave === 'anthropic_api_key') {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const c = new Anthropic({ apiKey: valor });
      await c.messages.countTokens({
        model: 'claude-haiku-4-5',
        messages: [{ role: 'user', content: 'test' }],
      });
      return res.json({ ok: true, mensaje: 'API key válida' });
    }
    res.json({ ok: true, mensaje: 'Test no implementado para esta clave' });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ── Configuración general empresa ────────────────
router.get('/empresa', auth(ROLES_DIRECTIVOS), async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT clave, valor, descripcion FROM configuracion_empresa
      WHERE clave NOT LIKE '%_api_key%'
        AND clave NOT LIKE '%_password%'
        AND clave NOT LIKE '%_token%'
        AND clave NOT LIKE '%_sid%'
      ORDER BY clave
    `);
    res.json(Object.fromEntries(rows.map(r => [r.clave, r])));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/empresa', auth(ROLES_DIRECTIVOS), async (req, res) => {
  const body = req.body || {};
  try {
    let n = 0;
    for (const [k, v] of Object.entries(body)) {
      // No permitimos guardar API keys aquí (van por endpoint dedicado)
      if (/_api_key|_password|_token|_sid/.test(k)) continue;
      const valor = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v ?? '');
      await db.query(`
        INSERT INTO configuracion_empresa (clave, valor, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()
      `, [k, valor]);
      n++;
    }
    res.json({ ok: true, actualizados: n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
