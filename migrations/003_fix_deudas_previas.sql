-- =============================================
-- VIVO — Migración 003: Fix de deudas previas
-- =============================================
-- El código existente referencía tablas/funciones que NO estaban en
-- migrations/001 ni 002. Esta migración las crea para que el sistema
-- jale en un deploy limpio (Railway nuevo, dev local, etc.).
--
-- Tablas afectadas:
--   1. asignaciones_ia            (usado por asignadorIA.js)
--   2. transportistas_checklist   (vista usada por transportistas.js)
--   3. lead_conversaciones        (usado por whatsapp.js)
--   4. lead_mensajes              (usado por whatsapp.js)
--   5. canales_webhooks_log       (usado por whatsapp.js)
--   6. recalcular_score_transportista() función (usada por transportistas.js)
--
-- NO crea operadores/unidades/etc. — eso es Andreu, no VIVO.
-- Si tu deploy actual ya tiene estas tablas (heredadas), IF NOT EXISTS
-- las saltará sin tocar datos.
-- =============================================

-- ────────────────────────────────────────────────────────────────
-- 1. asignaciones_ia — log de sugerencias del asignador
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asignaciones_ia (
  id                          BIGSERIAL PRIMARY KEY,
  viaje_id                    INTEGER REFERENCES viajes(id) ON DELETE CASCADE,
  lead_id                     INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  tipo_operacion              VARCHAR(20) NOT NULL DEFAULT 'broker'
                              CHECK (tipo_operacion IN ('propio','broker')),
  decision_motivo             TEXT,
  confianza                   VARCHAR(10)
                              CHECK (confianza IN ('alta','media','baja')),
  -- Si fue propio (legado Andreu, no aplica en VIVO pero compatible)
  operador_id                 INTEGER,
  unidad_id                   INTEGER,
  operador_score              DECIMAL(6,2),
  unidad_score                DECIMAL(6,2),
  -- Si fue broker (VIVO usa esto)
  transportista_externo_id    INTEGER REFERENCES transportistas_externos(id) ON DELETE SET NULL,
  transportista_score         DECIMAL(6,2),
  precio_broker_sugerido      DECIMAL(12,2),
  comision_estimada           DECIMAL(12,2),
  -- Audit
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
CREATE INDEX IF NOT EXISTS idx_asignaciones_viaje ON asignaciones_ia (viaje_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_estado ON asignaciones_ia (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asignaciones_transportista ON asignaciones_ia (transportista_externo_id);

-- ────────────────────────────────────────────────────────────────
-- 2. lead_conversaciones + lead_mensajes — para Vendedor IA + WhatsApp
-- ────────────────────────────────────────────────────────────────
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
CREATE INDEX IF NOT EXISTS idx_lead_conv_lead ON lead_conversaciones (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_conv_estado ON lead_conversaciones (estado, ultimo_mensaje_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_conv_identificador ON lead_conversaciones (canal, identificador);

CREATE TABLE IF NOT EXISTS lead_mensajes (
  id                  BIGSERIAL PRIMARY KEY,
  conversacion_id     BIGINT NOT NULL REFERENCES lead_conversaciones(id) ON DELETE CASCADE,
  direccion           VARCHAR(10) NOT NULL CHECK (direccion IN ('entrante','saliente')),
  remitente           VARCHAR(20)  -- 'cliente' | 'vivo' | 'admin' | 'sistema' | 'agente_ia'
                      CHECK (remitente IN ('cliente','vivo','admin','sistema','agente_ia')),
  contenido           TEXT,
  contenido_tipo      VARCHAR(20) DEFAULT 'texto'
                      CHECK (contenido_tipo IN ('texto','imagen','audio','video','documento','plantilla')),
  id_externo          VARCHAR(100),  -- Twilio MessageSid, SendGrid msgId, etc.
  estado_envio        VARCHAR(20) DEFAULT 'pendiente'
                      CHECK (estado_envio IN ('pendiente','enviado','entregado','leido','fallido','recibido')),
  error_envio         TEXT,
  agente_ia_nombre    VARCHAR(40),  -- 'vendedor', 'retencion', etc. si lo generó IA
  invocacion_ia_id    BIGINT REFERENCES agentes_invocaciones(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_msg_conv ON lead_mensajes (conversacion_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lead_msg_externo ON lead_mensajes (id_externo) WHERE id_externo IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- 3. canales_webhooks_log — bitácora cruda de payloads externos
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canales_webhooks_log (
  id              BIGSERIAL PRIMARY KEY,
  proveedor       VARCHAR(40) NOT NULL,  -- 'twilio', 'sendgrid', 'conekta', 'stripe', ...
  evento          VARCHAR(80) NOT NULL,  -- 'incoming_whatsapp', 'delivered', 'opened', ...
  payload         JSONB,
  procesado       BOOLEAN DEFAULT false,
  procesado_at    TIMESTAMPTZ,
  procesado_resultado JSONB,
  procesado_error TEXT,
  ip_origen       VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_proveedor ON canales_webhooks_log (proveedor, evento, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_pendientes ON canales_webhooks_log (procesado, created_at) WHERE procesado = false;

-- ────────────────────────────────────────────────────────────────
-- 4. transportistas_checklist — VISTA con flags de compliance
-- ────────────────────────────────────────────────────────────────
-- Devuelve por cada transportista qué documentos críticos tiene
-- y si cumple para verificación. Usada por GET /api/transportistas y checklist.
--
-- Los 5 documentos críticos: constancia_fiscal, permiso_sct,
-- poliza_seguro, ine_representante, contrato_servicios
CREATE OR REPLACE VIEW transportistas_checklist AS
SELECT
  t.id AS transportista_id,
  -- Cada doc crítico: existe + vigente
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo = 'constancia_fiscal'
      AND (d.vigencia_fin IS NULL OR d.vigencia_fin >= CURRENT_DATE)
  ) AS tiene_constancia_fiscal,
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo IN ('permiso_sct', 'permiso_sict')
      AND d.vigencia_fin IS NOT NULL AND d.vigencia_fin >= CURRENT_DATE
  ) AS permiso_sct_vigente,
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo = 'poliza_seguro'
      AND d.vigencia_fin IS NOT NULL AND d.vigencia_fin >= CURRENT_DATE
  ) AS poliza_seguro_vigente,
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo IN ('ine_representante', 'ine')
  ) AS tiene_ine_representante,
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo = 'contrato_servicios'
  ) AS tiene_contrato,
  -- Flags consolidados
  EXISTS (
    SELECT 1 FROM transportista_documentos d
    WHERE d.transportista_id = t.id
      AND d.tipo IN ('permiso_sct','permiso_sict','poliza_seguro','constancia_fiscal')
      AND d.vigencia_fin IS NOT NULL
      AND d.vigencia_fin < CURRENT_DATE
  ) AS tiene_docs_vencidos_criticos,
  -- ¿Cumple todos los 5 críticos?
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

-- ────────────────────────────────────────────────────────────────
-- 5. Función: recalcular_score_transportista(id)
-- ────────────────────────────────────────────────────────────────
-- Fórmula simple: base 50 + bonus por viajes completados + bonus
-- por calificación cliente - penalización por incidentes.
-- Mantiene el score entre 0 y 100.
--
-- Esta es la versión "v1" — el módulo E (trigger SQL automático) la
-- reemplazará por la fórmula 20+25+15+25+15 cuando lo construyamos.
CREATE OR REPLACE FUNCTION recalcular_score_transportista(p_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
  v_completados    INTEGER;
  v_total          INTEGER;
  v_incidentes     INTEGER;
  v_calif          DECIMAL;
  v_score          DECIMAL;
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

  -- Bonus calificación (★1=0, ★5=+25)
  v_score := v_score + ((v_calif - 1) / 4 * 25);

  -- Bonus viajes completados (0-15 puntos, cap a 30 viajes)
  v_score := v_score + LEAST(v_completados, 30) * 0.5;

  -- Penalización incidentes (5 puntos por incidente, cap -25)
  v_score := v_score - LEAST(v_incidentes * 5, 25);

  -- Tasa completitud (si hay datos)
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

-- ────────────────────────────────────────────────────────────────
-- 6. Trigger: actualizar updated_at automáticamente (utility)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a las tablas nuevas que tienen updated_at
DROP TRIGGER IF EXISTS trg_asignaciones_ia_updated ON asignaciones_ia;
CREATE TRIGGER trg_asignaciones_ia_updated BEFORE UPDATE ON asignaciones_ia
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_lead_conv_updated ON lead_conversaciones;
CREATE TRIGGER trg_lead_conv_updated BEFORE UPDATE ON lead_conversaciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────────
SELECT
  'Migración 003 (fix deudas previas) aplicada' AS resultado,
  (SELECT COUNT(*)::int FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('asignaciones_ia','lead_conversaciones','lead_mensajes','canales_webhooks_log')) AS tablas_creadas,
  (SELECT COUNT(*)::int FROM information_schema.views
   WHERE table_schema = 'public' AND table_name = 'transportistas_checklist') AS vistas_creadas,
  (SELECT COUNT(*)::int FROM pg_proc WHERE proname IN ('recalcular_score_transportista', 'set_updated_at')) AS funciones_creadas;
