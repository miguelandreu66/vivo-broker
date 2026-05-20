-- =============================================
-- VIVO — Migración 003: Fixes de deudas previas
-- =============================================
-- Crea las tablas, vistas, funciones, índices, constraints y seeds
-- que el código existente ya referenciaba pero que NO estaban
-- declaradas en migrations/001 ni 002.
--
-- Tras esta migración el sistema jala limpio en un deploy fresh
-- (Railway nuevo, dev local, etc.) sin tronar al consultar las
-- tablas faltantes.
--
-- Convenciones:
--   - CREATE TABLE IF NOT EXISTS (idempotente)
--   - INSERT ... ON CONFLICT DO NOTHING (idempotente)
--   - Triggers DROP IF EXISTS antes de CREATE (re-aplicable)
--   - Naming en snake_case español (clientes, viajes, etc.)
--
-- Rollback documentado al final del archivo (comentado).
-- =============================================

-- ─────────────────────────────────────────────────────────────────
-- 0. EXTENSIONES
-- ─────────────────────────────────────────────────────────────────
-- pgcrypto: necesaria para gen_random_uuid() que usaremos en
-- migración 005 (tracking_token en viajes).
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ═════════════════════════════════════════════════════════════════
-- 1. FUNCIÓN UTILITY: set_updated_at()
-- ═════════════════════════════════════════════════════════════════
-- Se usa como trigger BEFORE UPDATE en tablas con columna updated_at
-- para auto-actualizar el timestamp en cada UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ═════════════════════════════════════════════════════════════════
-- 2. TABLA: asignaciones_ia
-- ═════════════════════════════════════════════════════════════════
-- Log de cada sugerencia del asignador (v1 actual). Cuando esté listo
-- el asignacionEngine.js (v2), esta tabla seguirá usándose para
-- backward compat con asignadorIA.js mientras se hace el toggle.
--
-- Referenciada en: backend/src/lib/agents/asignadorIA.js (líneas 514, 543)
CREATE TABLE IF NOT EXISTS asignaciones_ia (
  id                          BIGSERIAL PRIMARY KEY,
  viaje_id                    INTEGER REFERENCES viajes(id) ON DELETE CASCADE,
  lead_id                     INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  tipo_operacion              VARCHAR(20) NOT NULL DEFAULT 'broker'
                              CHECK (tipo_operacion IN ('propio','broker')),
  decision_motivo             TEXT,
  confianza                   VARCHAR(10)
                              CHECK (confianza IN ('alta','media','baja')),

  -- Si fue propio (legado Andreu — VIVO no opera flota propia,
  -- pero mantenemos la columna por compat con asignadorIA.js v1)
  operador_id                 INTEGER,
  unidad_id                   INTEGER,
  operador_score              DECIMAL(6,2),
  unidad_score                DECIMAL(6,2),

  -- Si fue broker (caso normal en VIVO)
  transportista_externo_id    INTEGER REFERENCES transportistas_externos(id) ON DELETE SET NULL,
  transportista_score         DECIMAL(6,2),
  precio_broker_sugerido      DECIMAL(12,2),
  comision_estimada           DECIMAL(12,2),

  -- Audit + workflow
  candidatos                  JSONB,
  alertas                     JSONB,
  estado                      VARCHAR(20) DEFAULT 'sugerida'
                              CHECK (estado IN ('sugerida','aplicada','rechazada','expirada')),
  aprobada_por                INTEGER REFERENCES usuarios(id),
  aprobada_at                 TIMESTAMPTZ,
  fue_auto                    BOOLEAN DEFAULT false,
  notificado_operador         BOOLEAN DEFAULT false,
  notificado_transportista    BOOLEAN DEFAULT false,
  notificado_at               TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asignaciones_viaje
  ON asignaciones_ia (viaje_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_estado
  ON asignaciones_ia (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asignaciones_transportista
  ON asignaciones_ia (transportista_externo_id);

DROP TRIGGER IF EXISTS trg_asignaciones_ia_updated ON asignaciones_ia;
CREATE TRIGGER trg_asignaciones_ia_updated
  BEFORE UPDATE ON asignaciones_ia
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═════════════════════════════════════════════════════════════════
-- 3. TABLAS: lead_conversaciones + lead_mensajes
-- ═════════════════════════════════════════════════════════════════
-- Hilo conversacional con cliente por canal (WA/email/SMS).
-- Cada conversación tiene N mensajes (entrante/saliente).
--
-- Referenciada en: backend/src/lib/canales/whatsapp.js (líneas 122, 138)
CREATE TABLE IF NOT EXISTS lead_conversaciones (
  id                  BIGSERIAL PRIMARY KEY,
  lead_id             INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  canal               VARCHAR(20) NOT NULL DEFAULT 'whatsapp'
                      CHECK (canal IN ('whatsapp','email','sms','portal','manual')),
  identificador       VARCHAR(100),  -- número WA, email, etc.
  estado              VARCHAR(20) DEFAULT 'activa'
                      CHECK (estado IN ('activa','pausada','cerrada','escalada','perdida')),
  cliente_respondio   BOOLEAN DEFAULT false,
  total_mensajes      INTEGER DEFAULT 0,
  ultimo_mensaje_at   TIMESTAMPTZ,
  iniciada_por        VARCHAR(20) DEFAULT 'vivo'
                      CHECK (iniciada_por IN ('vivo','cliente','admin')),
  asignada_a          INTEGER REFERENCES usuarios(id),
  motivo_cierre       TEXT,
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_conv_lead
  ON lead_conversaciones (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_conv_estado
  ON lead_conversaciones (estado, ultimo_mensaje_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_conv_identificador
  ON lead_conversaciones (canal, identificador);

DROP TRIGGER IF EXISTS trg_lead_conv_updated ON lead_conversaciones;
CREATE TRIGGER trg_lead_conv_updated
  BEFORE UPDATE ON lead_conversaciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE IF NOT EXISTS lead_mensajes (
  id                  BIGSERIAL PRIMARY KEY,
  conversacion_id     BIGINT NOT NULL REFERENCES lead_conversaciones(id) ON DELETE CASCADE,
  direccion           VARCHAR(10) NOT NULL CHECK (direccion IN ('entrante','saliente')),
  remitente           VARCHAR(20)
                      CHECK (remitente IN ('cliente','vivo','admin','sistema','agente_ia')),
  contenido           TEXT,
  contenido_tipo      VARCHAR(20) DEFAULT 'texto'
                      CHECK (contenido_tipo IN ('texto','imagen','audio','video','documento','plantilla')),
  id_externo          VARCHAR(100),  -- Twilio MessageSid, SendGrid msgId, etc.
  estado_envio        VARCHAR(20) DEFAULT 'pendiente'
                      CHECK (estado_envio IN ('pendiente','enviado','entregado','leido','fallido','recibido')),
  error_envio         TEXT,
  agente_ia_nombre    VARCHAR(40),  -- 'vendedor','retencion',... si lo generó un agente
  invocacion_ia_id    BIGINT REFERENCES agentes_invocaciones(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_msg_conv
  ON lead_mensajes (conversacion_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lead_msg_externo
  ON lead_mensajes (id_externo) WHERE id_externo IS NOT NULL;


-- ═════════════════════════════════════════════════════════════════
-- 4. TABLA: canales_webhooks_log
-- ═════════════════════════════════════════════════════════════════
-- Bitácora cruda de payloads externos (Twilio, SendGrid, Conekta, etc.)
-- Útil para debug + auditoría + replay de webhooks.
--
-- Referenciada en: backend/src/lib/canales/whatsapp.js (línea 108)
CREATE TABLE IF NOT EXISTS canales_webhooks_log (
  id                      BIGSERIAL PRIMARY KEY,
  proveedor               VARCHAR(40) NOT NULL,
                          -- 'twilio','sendgrid','conekta','stripe','mifiel'
  evento                  VARCHAR(80) NOT NULL,
                          -- 'incoming_whatsapp','delivered','opened','pago_exitoso','firma_completada'
  payload                 JSONB,
  procesado               BOOLEAN DEFAULT false,
  procesado_at            TIMESTAMPTZ,
  procesado_resultado     JSONB,
  procesado_error         TEXT,
  ip_origen               VARCHAR(50),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_proveedor
  ON canales_webhooks_log (proveedor, evento, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_pendientes
  ON canales_webhooks_log (procesado, created_at) WHERE procesado = false;


-- ═════════════════════════════════════════════════════════════════
-- 5. VISTA: transportistas_checklist
-- ═════════════════════════════════════════════════════════════════
-- Devuelve por cada transportista los flags consolidados de compliance:
-- qué docs críticos tiene, cuáles están vigentes, si tiene docs vencidos,
-- y si cumple los 5 requisitos para verificación.
--
-- Los 5 documentos críticos (NO negociables para verificar):
--   1. constancia_fiscal           (SAT, sin vigencia explícita o aún vigente)
--   2. permiso_sct OR permiso_sict (SCT/SICT, vigente)
--   3. poliza_seguro               (carga, vigente)
--   4. ine_representante OR ine    (representante legal)
--   5. contrato_servicios          (firmado con VIVO)
--
-- Referenciada en: backend/src/routes/transportistas.js (líneas 41, 187)
CREATE OR REPLACE VIEW transportistas_checklist AS
SELECT
  t.id AS transportista_id,

  -- 1) Constancia fiscal (sin vigencia O vigente)
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo = 'constancia_fiscal'
      AND (d.vigencia_fin IS NULL OR d.vigencia_fin >= CURRENT_DATE)
  ) AS tiene_constancia_fiscal,

  -- 2) Permiso SCT/SICT vigente
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo IN ('permiso_sct', 'permiso_sict')
      AND d.vigencia_fin IS NOT NULL AND d.vigencia_fin >= CURRENT_DATE
  ) AS permiso_sct_vigente,

  -- 3) Póliza de seguro vigente
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo = 'poliza_seguro'
      AND d.vigencia_fin IS NOT NULL AND d.vigencia_fin >= CURRENT_DATE
  ) AS poliza_seguro_vigente,

  -- 4) INE del representante
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo IN ('ine_representante', 'ine')
  ) AS tiene_ine_representante,

  -- 5) Contrato firmado con VIVO
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo = 'contrato_servicios'
  ) AS tiene_contrato,

  -- Flag: ¿tiene algún doc crítico vencido?
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo IN ('permiso_sct','permiso_sict','poliza_seguro','constancia_fiscal')
      AND d.vigencia_fin IS NOT NULL
      AND d.vigencia_fin < CURRENT_DATE
  ) AS tiene_docs_vencidos_criticos,

  -- Flag consolidado: ¿cumple para pasar a verificado?
  -- Debe cumplir los 5 críticos AL MISMO TIEMPO
  (
    EXISTS (SELECT 1 FROM transportista_documentos d
            WHERE d.transportista_id = t.id AND d.tipo = 'constancia_fiscal'
              AND (d.vigencia_fin IS NULL OR d.vigencia_fin >= CURRENT_DATE))
    AND
    EXISTS (SELECT 1 FROM transportista_documentos d
            WHERE d.transportista_id = t.id AND d.tipo IN ('permiso_sct','permiso_sict')
              AND d.vigencia_fin IS NOT NULL AND d.vigencia_fin >= CURRENT_DATE)
    AND
    EXISTS (SELECT 1 FROM transportista_documentos d
            WHERE d.transportista_id = t.id AND d.tipo = 'poliza_seguro'
              AND d.vigencia_fin IS NOT NULL AND d.vigencia_fin >= CURRENT_DATE)
    AND
    EXISTS (SELECT 1 FROM transportista_documentos d
            WHERE d.transportista_id = t.id AND d.tipo IN ('ine_representante','ine'))
    AND
    EXISTS (SELECT 1 FROM transportista_documentos d
            WHERE d.transportista_id = t.id AND d.tipo = 'contrato_servicios')
  ) AS cumple_para_verificacion
FROM transportistas_externos t;


-- ═════════════════════════════════════════════════════════════════
-- 6. FUNCIÓN: recalcular_score_transportista(id) — v1
-- ═════════════════════════════════════════════════════════════════
-- Fórmula simple v1: base 50 + bonus calificación + bonus completados
-- + tasa completitud - penalización incidentes. Clampeada [0, 100].
--
-- ⚠️ Esta v1 será REEMPLAZADA por trigger de migración 005 que aplica
-- la fórmula 20/25/15/25/15 (cumplimiento_salida + cumplimiento_entrega
-- + calidad_comunicacion + estado_carga + feedback_cliente) con ventana
-- móvil de los últimos 20 viajes. La función v1 se mantiene porque
-- routes/transportistas.js la invoca explícitamente en el endpoint
-- POST /:id/recalcular-score como recálculo manual.
--
-- Referenciada en: backend/src/routes/transportistas.js (línea 368)
CREATE OR REPLACE FUNCTION recalcular_score_transportista(p_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
  v_completados   INTEGER;
  v_total         INTEGER;
  v_incidentes    INTEGER;
  v_calif         DECIMAL;
  v_score         DECIMAL;
BEGIN
  SELECT
    COALESCE(total_viajes_completados, 0),
    COALESCE(total_viajes, 0),
    COALESCE(total_incidentes, 0),
    COALESCE(calificacion, 3.0)
  INTO v_completados, v_total, v_incidentes, v_calif
  FROM transportistas_externos
  WHERE id = p_id;

  IF v_completados IS NULL THEN
    RETURN NULL;  -- transportista no existe
  END IF;

  -- Score base 50
  v_score := 50;

  -- Bonus calificación (★1 = +0, ★5 = +25)
  v_score := v_score + ((v_calif - 1) / 4 * 25);

  -- Bonus viajes completados (0-15 puntos, cap a 30 viajes)
  v_score := v_score + LEAST(v_completados, 30) * 0.5;

  -- Penalización incidentes (-5 puntos por incidente, cap -25)
  v_score := v_score - LEAST(v_incidentes * 5, 25);

  -- Tasa completitud (si hay datos: -8 si <80%, +7.5 si 100%)
  IF v_total > 0 THEN
    v_score := v_score + ((v_completados::decimal / v_total) - 0.8) * 15;
  END IF;

  -- Clamp [0, 100]
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Persistir
  UPDATE transportistas_externos
  SET score_automatico = v_score, updated_at = NOW()
  WHERE id = p_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;


-- ═════════════════════════════════════════════════════════════════
-- 7. SEEDS: configuraciones default en configuracion_empresa
-- ═════════════════════════════════════════════════════════════════
-- El código existente lee estas configs pero NO estaban en el seed
-- original de migración 001. Sin estos defaults, asignadorIA.js falla
-- al iniciar (las lee con parseFloat sobre NULL).
INSERT INTO configuracion_empresa (clave, valor, descripcion) VALUES
  -- Asignador v1 (mientras asignacionEngine.js v2 se construye)
  ('asignador_activo',                              'true',
   'Activa sistema de asignación automática'),
  ('asignador_auto_aprobar',                        'false',
   'Si true, asignaciones con confianza alta se aplican sin aprobación humana'),
  ('asignador_umbral_confianza_auto',               'alta',
   'Confianza mínima para auto-aprobar: baja|media|alta'),
  ('asignador_peso_calificacion',                   '30',
   'Peso 0-100 de la calificación ★ en el ranking'),
  ('asignador_peso_disponibilidad',                 '40',
   'Peso 0-100 de disponibilidad en ranking'),
  ('asignador_peso_rotacion',                       '15',
   'Peso 0-100 de rotación (penaliza concentración)'),
  ('asignador_peso_capacidad',                      '15',
   'Peso 0-100 de capacidad técnica (match tipo carga)'),
  ('asignador_notificar_operador',                  'true',
   'Notifica al operador por WhatsApp al asignar (solo si tipo_operacion=propio)'),
  ('asignador_notificar_transportista',             'true',
   'Notifica al transportista por WhatsApp al asignar'),
  ('asignador_usar_claude_explicacion',             'true',
   'Si true, Claude Haiku genera explicación 2-3 oraciones de la decisión'),
  ('asignador_modelo_explicacion',                  'claude-haiku-4-5',
   'Modelo Claude para explicaciones de asignación'),

  -- Alertas broker (cashflow watchdog + concentración)
  ('broker_alerta_concentracion_cliente_pct',       '25',
   'Alerta si un cliente concentra más de este % del volumen broker 90d'),
  ('broker_alerta_concentracion_transportista_pct', '30',
   'Alerta si un transportista concentra más de este % del volumen broker 90d'),
  ('broker_alerta_exposicion_critica_mxn',          '100000',
   'Exposición neta arriba de esto = nivel CRÍTICO'),
  ('broker_alerta_exposicion_alerta_mxn',           '50000',
   'Exposición neta arriba de esto = nivel ALERTA')
ON CONFLICT (clave) DO NOTHING;


-- ═════════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═════════════════════════════════════════════════════════════════
SELECT
  'Migración 003 (fixes deudas previas) aplicada' AS resultado,
  (SELECT COUNT(*)::int FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('asignaciones_ia','lead_conversaciones','lead_mensajes','canales_webhooks_log')
  ) AS tablas_creadas,
  (SELECT COUNT(*)::int FROM information_schema.views
   WHERE table_schema = 'public' AND table_name = 'transportistas_checklist'
  ) AS vistas_creadas,
  (SELECT COUNT(*)::int FROM pg_proc
   WHERE proname IN ('set_updated_at','recalcular_score_transportista')
  ) AS funciones_creadas,
  (SELECT COUNT(*)::int FROM configuracion_empresa
   WHERE clave LIKE 'asignador_%' OR clave LIKE 'broker_alerta_%'
  ) AS configs_seedeadas,
  (SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')) AS pgcrypto_instalado;


-- =============================================
-- ROLLBACK (documentado, NO ejecutar a menos que sea necesario)
-- =============================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_asignaciones_ia_updated ON asignaciones_ia;
-- DROP TRIGGER IF EXISTS trg_lead_conv_updated      ON lead_conversaciones;
-- DROP VIEW IF EXISTS transportistas_checklist;
-- DROP TABLE IF EXISTS canales_webhooks_log CASCADE;
-- DROP TABLE IF EXISTS lead_mensajes        CASCADE;
-- DROP TABLE IF EXISTS lead_conversaciones  CASCADE;
-- DROP TABLE IF EXISTS asignaciones_ia      CASCADE;
-- DROP FUNCTION IF EXISTS recalcular_score_transportista(INTEGER);
-- DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
-- DELETE FROM configuracion_empresa
--   WHERE clave LIKE 'asignador_%' OR clave LIKE 'broker_alerta_%';
-- -- pgcrypto NO se desinstala (no rompe nada y puede ser usada por otras migraciones)
-- COMMIT;
--
-- ⚠️ Tras rollback el código backend volverá a tronar al consultar
-- las tablas dropeadas. NO rollback en producción a menos que vayas
-- a roll-forward inmediato.
