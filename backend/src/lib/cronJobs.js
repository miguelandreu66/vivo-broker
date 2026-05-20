// ════════════════════════════════════════════════════════════════
// VIVO — Cron Jobs (autopilot)
// ════════════════════════════════════════════════════════════════
// Tareas automáticas que corren en segundo plano:
//   - Auditor IA: lunes 7am análisis estratégico semanal
//   - Retención IA: diaria 9am scoring + acciones a clientes
//   - Atracción IA: lunes 10am genera contenido marketing
//   - CFDI reintentos: cada 15 min reintenta CFDIs fallidos
//   - Vendedor IA drip: cada 30 min procesa drip campaigns
//   - Broker cashflow watchdog: 6:30am marca pagos vencidos
//   - Filtro transportistas: 4:15am degrada los con docs vencidos
// ════════════════════════════════════════════════════════════════

const cron = require('node-cron');
const db = require('../db');

const TZ = process.env.CRON_TZ || 'America/Mexico_City';
const JOBS = new Map();

async function logJob(nombre, resultado, error = null, manual = false) {
  try {
    await db.query(`
      INSERT INTO audit_log (usuario_id, accion, entidad, detalle, ip)
      VALUES (NULL, $1, 'cron', $2, $3)
    `, [
      `cron_${nombre}${manual ? '_manual' : ''}`,
      { resultado, error: error?.message || null },
      manual ? 'manual' : 'scheduler',
    ]).catch(() => {});  // si audit_log no existe, ignora
  } catch (e) {
    console.warn('cron audit:', e.message);
  }
}

const TAREAS = {
  // ─── Auditor IA semanal (lunes 7am) ────────────────────
  auditor_ia_semanal: {
    schedule: '0 7 * * 1',
    descripcion: 'Auditor IA semanal — Claude analiza el negocio y emite hallazgos (lunes 7am)',
    ejecutar: async () => {
      const auditor = require('./agents/auditorIA');
      const { rows: [cfg] } = await db.query(`
        SELECT valor FROM configuracion_empresa WHERE clave = 'auditor_ia_activo'
      `).catch(() => ({ rows: [{ valor: 'false' }] }));
      if (cfg?.valor !== 'true') return { skipped: true, motivo: 'auditor_ia_activo=false' };
      const r = await auditor.ejecutarAuditoria({ tipo: 'programada' });
      return {
        ejecucion_id: r.ejecucion_id,
        hallazgos: r.hallazgos_insertados,
        costo_usd: r.costo_usd?.toFixed(4),
      };
    },
  },

  // ─── Retención IA diaria (9am) ─────────────────────────
  retencion_ia_diario: {
    schedule: '0 9 * * *',
    descripcion: 'Retención IA — scoring clientes + envío drip campaigns (9am diario)',
    ejecutar: async () => {
      const retencion = require('./agents/retencionIA');
      return await retencion.correrCicloDiario();
    },
  },

  // ─── Atracción IA semanal (lunes 10am) ─────────────────
  atraccion_ia_semanal: {
    schedule: '0 10 * * 1',
    descripcion: 'Atracción IA — genera 1 post LinkedIn + 1 blog post (lunes 10am)',
    ejecutar: async () => {
      const atraccion = require('./agents/atraccionIA');
      return await atraccion.correrCicloSemanal();
    },
  },

  // ─── Vendedor IA drip (cada 30 min) ────────────────────
  vendedor_ia_drip: {
    schedule: '*/30 * * * *',
    descripcion: 'Vendedor IA — procesa drip campaigns pendientes (cada 30 min)',
    ejecutar: async () => {
      const vendedor = require('./agents/vendedorIA');
      return await vendedor.procesarDripPendientes();
    },
  },

  // ─── CFDI reintentos (cada 15 min) ─────────────────────
  cfdi_reintentos: {
    schedule: '*/15 * * * *',
    descripcion: 'CFDI — reintentar timbrado de CFDIs fallidos (max 3 intentos)',
    ejecutar: async () => {
      const { rows: pendientes } = await db.query(`
        SELECT c.id, c.viaje_id,
          (SELECT COUNT(*) FROM cfdi_eventos WHERE cfdi_id = c.id AND evento = 'error_pac')::int AS intentos
        FROM cfdi_emitidos c
        WHERE c.estado = 'fallido'
          AND c.viaje_id IS NOT NULL
          AND c.created_at > NOW() - INTERVAL '24 hours'
        LIMIT 10
      `).catch(() => ({ rows: [] }));

      const elegibles = pendientes.filter(p => (p.intentos || 0) < 3);
      let exitos = 0, fallidos = 0;
      for (const p of elegibles) {
        try {
          const facturama = require('./fiscal/facturama');
          const builder = require('./fiscal/cfdiBuilder');
          if (!(await facturama.isAvailable())) break;

          const { rows: [viaje] } = await db.query('SELECT * FROM viajes WHERE id = $1', [p.viaje_id]);
          if (!viaje) { fallidos++; continue; }
          const { rows: [cliente] } = await db.query('SELECT * FROM clientes WHERE id = $1', [viaje.cliente_id]);
          if (!cliente) { fallidos++; continue; }

          const { payload } = await builder.construirPayload({ viaje, cliente });
          const resp = await facturama.emitirCfdi(payload);
          const uuid = resp.Complement?.TaxStamp?.Uuid || resp.Id || null;

          await db.query(`
            UPDATE cfdi_emitidos
            SET estado = 'emitido', uuid_fiscal = $1, fecha_emision = NOW(),
                pac_respuesta = $2, error_mensaje = NULL, updated_at = NOW()
            WHERE id = $3
          `, [uuid, resp, p.id]);
          exitos++;
        } catch (e) {
          await db.query(`INSERT INTO cfdi_eventos (cfdi_id, evento, detalle) VALUES ($1, 'reintento_fallido', $2)`,
            [p.id, { error: e.message, intentos: p.intentos + 1 }]).catch(() => {});
          fallidos++;
        }
      }
      return { reintentos: elegibles.length, exitos, fallidos };
    },
  },

  // ─── Broker cashflow watchdog (6:30am diario) ──────────
  broker_cashflow_watchdog: {
    schedule: '30 6 * * *',
    descripcion: 'Broker — marcar pagos vencidos + snapshot exposición (6:30am)',
    ejecutar: async () => {
      const { rows: [{ broker_marcar_vencidos: nVencidos }] } = await db.query('SELECT broker_marcar_vencidos()')
        .catch(() => ({ rows: [{ broker_marcar_vencidos: 0 }] }));
      const { rows: [exp] } = await db.query('SELECT * FROM broker_cashflow_exposicion').catch(() => ({ rows: [{}] }));
      return {
        pagos_marcados_vencidos: nVencidos,
        exposicion_neta: Math.round(exp.exposicion_neta || 0),
        pendiente_cobrar: Math.round(exp.pendiente_cobrar_cliente || 0),
        pendiente_pagar: Math.round(exp.pendiente_pagar_transportista || 0),
      };
    },
  },

  // ─── Filtro transportistas (4:15am) ────────────────────
  filtro_transportistas: {
    schedule: '15 4 * * *',
    descripcion: 'Transportistas — degradar verificados con docs vencidos (4:15am)',
    ejecutar: async () => {
      const { rows: degradados } = await db.query(`
        UPDATE transportistas_externos t
        SET estado_verificacion = 'en_revision', updated_at = NOW()
        FROM transportista_documentos d
        WHERE d.transportista_id = t.id
          AND d.tipo IN ('permiso_sct','poliza_seguro')
          AND d.vigencia_fin IS NOT NULL AND d.vigencia_fin < CURRENT_DATE
          AND t.estado_verificacion = 'verificado'
        RETURNING t.id, t.razon_social
      `).catch(() => ({ rows: [] }));

      // Recalcular score automático de todos los activos
      await db.query(`
        UPDATE transportistas_externos
        SET score_automatico = LEAST(100, GREATEST(0,
              (calificacion * 10) +
              (total_viajes_completados * 2) -
              (total_incidentes * 15)
            )),
            updated_at = NOW()
        WHERE activo = true
      `).catch(() => {});

      return {
        degradados_por_docs: degradados.length,
        muestra: degradados.slice(0, 5).map(d => d.razon_social),
      };
    },
  },

  // ─── Limpieza diaria audit_log + invocaciones IA (3am) ──
  limpieza_logs: {
    schedule: '0 3 * * *',
    descripcion: 'Limpieza — borrar logs >180 días (3am)',
    ejecutar: async () => {
      const a = await db.query(`DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '180 days'`).catch(() => ({ rowCount: 0 }));
      const i = await db.query(`DELETE FROM agentes_invocaciones WHERE created_at < NOW() - INTERVAL '180 days'`).catch(() => ({ rowCount: 0 }));
      return { audit_log_borrados: a.rowCount, agentes_invocaciones_borradas: i.rowCount };
    },
  },

  // ─── Backup diario (3:30am) ──
  // Se puede deshabilitar con ENABLE_BACKUP=false. Si BACKUP_DIR no se define,
  // usa el path por defecto del script. Si quieres off-site, scripts/upload-backup-r2.js
  // (no incluido) puede leer el .json.gz y subirlo a Cloudflare R2 / S3.
  backup_diario: {
    schedule: '30 3 * * *',
    descripcion: 'Backup — dump JSON.gz de toda la DB (3:30am)',
    ejecutar: async () => {
      if (process.env.ENABLE_BACKUP === 'false') {
        return { skipped: true, razon: 'ENABLE_BACKUP=false' };
      }
      const { spawn } = require('child_process');
      const path = require('path');
      return new Promise((resolve) => {
        const script = path.join(__dirname, '..', '..', 'scripts', 'backup-db.js');
        const env = { ...process.env };
        if (process.env.BACKUP_DIR) env.BACKUP_DIR = process.env.BACKUP_DIR;
        const child = spawn('node', [script], { env, stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let err = '';
        child.stdout.on('data', d => out += d.toString());
        child.stderr.on('data', d => err += d.toString());
        child.on('exit', code => {
          if (code === 0) {
            // Extraer la línea "💾 Backup guardado: ..."
            const linea = out.split('\n').find(l => l.includes('Backup guardado')) || '';
            resolve({ ok: true, resumen: linea.trim() || 'completo' });
          } else {
            resolve({ ok: false, error: err.slice(-500) || `exit ${code}` });
          }
        });
        child.on('error', (e) => resolve({ ok: false, error: e.message }));
      });
    },
  },
};

function iniciar() {
  if (process.env.ENABLE_CRON === 'false') {
    console.log('[CRON] Deshabilitado por ENABLE_CRON=false');
    return;
  }

  for (const [nombre, def] of Object.entries(TAREAS)) {
    const job = cron.schedule(def.schedule, async () => {
      const t0 = Date.now();
      console.log(`[CRON] ${nombre} iniciando...`);
      try {
        const r = await def.ejecutar();
        const ms = Date.now() - t0;
        console.log(`[CRON] ${nombre} OK (${ms}ms):`, JSON.stringify(r).slice(0, 300));
        await logJob(nombre, { ...r, duracion_ms: ms });
      } catch (e) {
        console.error(`[CRON] ${nombre} ERROR:`, e.message);
        await logJob(nombre, null, e);
      }
    }, { timezone: TZ, scheduled: true });

    JOBS.set(nombre, job);
  }

  console.log(`[CRON] ${JOBS.size} job(s) programados (timezone: ${TZ}):`);
  for (const [nombre, def] of Object.entries(TAREAS)) {
    console.log(`  · ${nombre}: ${def.schedule} — ${def.descripcion}`);
  }
}

function estado() {
  return Object.entries(TAREAS).map(([nombre, def]) => ({
    nombre,
    schedule: def.schedule,
    descripcion: def.descripcion,
    activo: JOBS.has(nombre),
  }));
}

async function disparar(nombre, usuarioId = null) {
  const def = TAREAS[nombre];
  if (!def) throw new Error(`Job no encontrado: ${nombre}`);
  const t0 = Date.now();
  try {
    const r = await def.ejecutar();
    const ms = Date.now() - t0;
    await logJob(nombre, { ...r, duracion_ms: ms, ejecutado_por: usuarioId }, null, true);
    return { ok: true, duracion_ms: ms, resultado: r };
  } catch (e) {
    await logJob(nombre, null, e, true);
    throw e;
  }
}

module.exports = { iniciar, estado, disparar, tareasDisponibles: () => Object.keys(TAREAS) };
