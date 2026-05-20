-- =============================================
-- VIVO — Migración 004: Planes, cascada, tracking, incidencias, score
-- =============================================
-- Tablas + datos seed para soportar los módulos B/C/D/E del roadmap.
--
-- Contiene:
--   1. transportista_planes (catálogo Basic / Pro / Elite)
--   2. transportista_suscripciones (suscripción activa por transportista)
--   3. transportista_disponibilidad (declaración diaria por zona/horario)
--   4. asignacion_intentos (log de notificaciones cascada)
--   5. viaje_tracking (pings GPS durante viaje)
--   6. incidencias (registro formal con severidad)
--   7. transportista_score_historial (auditoría de cambios)
--   8. UPDATE vivo_tiers_servicio CRITICAL → 15min/2hr
--   9. Columnas extra para feedback en viajes
--  10. Trigger E: score automático con fórmula 20/25/15/25/15
-- =============================================

-- ────────────────────────────────────────────────────────────────
-- 1. CATÁLOGO DE PLANES (Basic / Pro / Elite)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transportista_planes (
  codigo                  VARCHAR(20) PRIMARY KEY,
  nombre                  VARCHAR(80) NOT NULL,
  precio_mensual_mxn      DECIMAL(10,2) NOT NULL,
  emoji                   VARCHAR(8),
  descripcion             TEXT,
  -- Beneficios (todo booleano para query fácil)
  acceso_pool_critical    BOOLEAN DEFAULT false,
  notificacion_prioritaria BOOLEAN DEFAULT false,
  badge_verificado        BOOLEAN DEFAULT false,
  soporte_24_7            BOOLEAN DEFAULT false,
  exclusividad_zona       BOOLEAN DEFAULT false,
  pago_acelerado_dias     INTEGER,            -- NULL = pago estándar 15d
  ops_minimas_garantizadas INTEGER,           -- NULL = sin garantía
  capacitacion_premium    BOOLEAN DEFAULT false,
  -- Display
  orden                   INTEGER DEFAULT 1,
  activo                  BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO transportista_planes
  (codigo, nombre, precio_mensual_mxn, emoji, descripcion,
   acceso_pool_critical, notificacion_prioritaria, badge_verificado,
   soporte_24_7, exclusividad_zona, pago_acelerado_dias, ops_minimas_garantizadas,
   capacitacion_premium, orden) VALUES
  ('BASIC', 'VIVO Driver Basic', 0,    '🟢',
   'Acceso al pool de operaciones VIVO sin costo. Ves y te postulas a viajes disponibles.',
   false, false, false, false, false, NULL, NULL, false, 1),
  ('PRO', 'VIVO Driver Pro',    1500, '🟡',
   'Notificaciones prioritarias, badge verificado, capacitación premium, soporte 24/7.',
   false, true, true, true, false, NULL, NULL, true, 2),
  ('ELITE', 'VIVO Driver Elite', 3000, '🔴',
   'Acceso al pool CRITICAL, exclusividad de zona, garantía mínima 3 ops/mes, pago acelerado 7 días.',
   true, true, true, true, true, 7, 3, true, 3)
ON CONFLICT (codigo) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 2. SUSCRIPCIONES (1 activa por transportista, historial completo)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transportista_suscripciones (
  id                          BIGSERIAL PRIMARY KEY,
  transportista_id            INTEGER NOT NULL REFERENCES transportistas_externos(id) ON DELETE CASCADE,
  plan_codigo                 VARCHAR(20) NOT NULL REFERENCES transportista_planes(codigo),
  estado                      VARCHAR(20) NOT NULL DEFAULT 'activa'
                              CHECK (estado IN ('activa','pausada','cancelada','suspendida_pago','vencida')),
  inicio_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fin_at                      TIMESTAMPTZ,         -- NULL = activa hoy
  proximo_cobro_at            TIMESTAMPTZ,         -- cuándo vence el ciclo actual
  ultimo_cobro_at             TIMESTAMPTZ,
  ultimo_cobro_monto_mxn      DECIMAL(10,2),
  fallos_cobro_consecutivos   INTEGER DEFAULT 0,
  -- Integración pagos (Conekta — decisión D8)
  proveedor_pago              VARCHAR(20) DEFAULT 'conekta'
                              CHECK (proveedor_pago IN ('conekta','stripe','manual','cortesia')),
  customer_id_externo         VARCHAR(120),        -- Conekta customer ID
  source_id_externo           VARCHAR(120),        -- método pago default
  -- Audit
  cancelada_motivo            TEXT,
  cancelada_por               INTEGER REFERENCES usuarios(id),
  cancelada_at                TIMESTAMPTZ,
  notas                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_susc_transportista ON transportista_suscripciones (transportista_id, estado);
CREATE INDEX IF NOT EXISTS idx_susc_proximo_cobro ON transportista_suscripciones (proximo_cobro_at) WHERE estado = 'activa';

-- Constraint: solo 1 suscripción activa por transportista (unique partial)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_susc_activa_por_transportista
  ON transportista_suscripciones (transportista_id) WHERE estado = 'activa';

DROP TRIGGER IF EXISTS trg_susc_updated ON transportista_suscripciones;
CREATE TRIGGER trg_susc_updated BEFORE UPDATE ON transportista_suscripciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-crear suscripción BASIC al verificar un transportista
CREATE OR REPLACE FUNCTION auto_crear_suscripcion_basic()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado_verificacion = 'verificado'
     AND (OLD.estado_verificacion IS NULL OR OLD.estado_verificacion != 'verificado')
  THEN
    -- Solo si no tiene suscripción activa ya
    INSERT INTO transportista_suscripciones (transportista_id, plan_codigo, estado, proveedor_pago)
    SELECT NEW.id, 'BASIC', 'activa', 'cortesia'
    WHERE NOT EXISTS (
      SELECT 1 FROM transportista_suscripciones
      WHERE transportista_id = NEW.id AND estado = 'activa'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_susc_basic ON transportistas_externos;
CREATE TRIGGER trg_auto_susc_basic AFTER UPDATE ON transportistas_externos
  FOR EACH ROW EXECUTE FUNCTION auto_crear_suscripcion_basic();

-- ────────────────────────────────────────────────────────────────
-- 3. DISPONIBILIDAD DECLARADA (cada transportista declara por día/zona)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transportista_disponibilidad (
  id                  BIGSERIAL PRIMARY KEY,
  transportista_id    INTEGER NOT NULL REFERENCES transportistas_externos(id) ON DELETE CASCADE,
  fecha               DATE NOT NULL,
  hora_desde          TIME DEFAULT '00:00',
  hora_hasta          TIME DEFAULT '23:59',
  zonas               TEXT[] DEFAULT '{}',          -- ['cdmx','toluca','puebla',...]
  tipos_unidad        TEXT[] DEFAULT '{}',          -- ['caja_seca','plataforma','refrigerado',...]
  unidades_disponibles INTEGER DEFAULT 1,
  acepta_critical     BOOLEAN DEFAULT false,        -- requiere plan ELITE; el sistema lo valida
  acepta_express      BOOLEAN DEFAULT true,
  acepta_urgent       BOOLEAN DEFAULT true,
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_disp_fecha ON transportista_disponibilidad (fecha, transportista_id);
CREATE INDEX IF NOT EXISTS idx_disp_zonas ON transportista_disponibilidad USING GIN (zonas);

DROP TRIGGER IF EXISTS trg_disp_updated ON transportista_disponibilidad;
CREATE TRIGGER trg_disp_updated BEFORE UPDATE ON transportista_disponibilidad
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────────
-- 4. INTENTOS DE ASIGNACIÓN (log de notificaciones cascada B)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asignacion_intentos (
  id                      BIGSERIAL PRIMARY KEY,
  lead_id                 INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  viaje_id                INTEGER REFERENCES viajes(id) ON DELETE SET NULL,
  asignacion_ia_id        BIGINT REFERENCES asignaciones_ia(id) ON DELETE SET NULL,
  transportista_id        INTEGER NOT NULL REFERENCES transportistas_externos(id),
  anillo                  INTEGER NOT NULL DEFAULT 1
                          CHECK (anillo BETWEEN 1 AND 5),
  -- Notificación
  canal                   VARCHAR(20) NOT NULL DEFAULT 'whatsapp'
                          CHECK (canal IN ('whatsapp','sms','push','email','llamada')),
  canal_id_externo        VARCHAR(100),       -- Twilio MessageSid, etc.
  enviado_at              TIMESTAMPTZ DEFAULT NOW(),
  -- Respuesta
  respondio_at            TIMESTAMPTZ,
  respuesta               VARCHAR(20)
                          CHECK (respuesta IN ('acepta','rechaza','no_responde','contraoferta','expirado','seleccionado_otro')),
  precio_contraoferta_mxn DECIMAL(12,2),
  notas_respuesta         TEXT,
  -- Resolución global del lead (cuál ganó)
  fue_seleccionado        BOOLEAN DEFAULT false,
  -- Por qué fue elegido este transportista
  score_al_intento        DECIMAL(6,2),
  motivo_seleccion        TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_intentos_lead ON asignacion_intentos (lead_id, anillo, enviado_at);
CREATE INDEX IF NOT EXISTS idx_intentos_transportista ON asignacion_intentos (transportista_id, enviado_at DESC);
CREATE INDEX IF NOT EXISTS idx_intentos_sin_respuesta
  ON asignacion_intentos (enviado_at) WHERE respondio_at IS NULL;

-- ────────────────────────────────────────────────────────────────
-- 5. TRACKING GPS POR VIAJE (módulo C)
-- ────────────────────────────────────────────────────────────────
-- Cada viaje tiene un token UUID único que el transportista usa
-- desde su app móvil para reportar GPS sin necesidad de JWT user.

-- Token de tracking en viajes (UUID generado al asignar)
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS tracking_token UUID;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS tracking_polyline TEXT;  -- polyline encoded de la ruta esperada
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS tracking_distancia_km_esperada DECIMAL(10,2);
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS tracking_duracion_min_esperada INTEGER;
CREATE INDEX IF NOT EXISTS idx_viajes_tracking_token ON viajes (tracking_token) WHERE tracking_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS viaje_tracking (
  id                  BIGSERIAL PRIMARY KEY,
  viaje_id            INTEGER NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
  lat                 DECIMAL(10,7) NOT NULL,
  lng                 DECIMAL(10,7) NOT NULL,
  velocidad_kmh       DECIMAL(6,2),
  rumbo_grados        DECIMAL(6,2),
  precision_m         DECIMAL(8,2),
  bateria_pct         INTEGER,
  -- Detección de desviación
  distancia_a_ruta_m  DECIMAL(10,2),    -- distancia haversine al polyline más cercano
  desviado            BOOLEAN DEFAULT false,
  -- Fuente
  fuente              VARCHAR(20) DEFAULT 'app_movil'
                      CHECK (fuente IN ('app_movil','gps_provider','manual','simulado')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tracking_viaje_tiempo ON viaje_tracking (viaje_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_desviado ON viaje_tracking (viaje_id, desviado) WHERE desviado = true;

-- ────────────────────────────────────────────────────────────────
-- 6. INCIDENCIAS (módulo D)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidencias (
  id                      BIGSERIAL PRIMARY KEY,
  viaje_id                INTEGER REFERENCES viajes(id) ON DELETE SET NULL,
  lead_id                 INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  transportista_id        INTEGER REFERENCES transportistas_externos(id),
  cliente_id              INTEGER REFERENCES clientes(id),
  -- Clasificación
  tipo                    VARCHAR(40) NOT NULL
                          CHECK (tipo IN (
                            'retraso','desviacion_gps','sin_respuesta',
                            'mercancia_danada','mercancia_robada','accidente',
                            'descompostura','falsa_documentacion','queja_cliente',
                            'queja_transportista','sla_incumplido','otro')),
  severidad               INTEGER NOT NULL CHECK (severidad BETWEEN 1 AND 4),
  -- 1=crítico (riesgo vida/mercancía/SLA), 2=alto (afecta cliente), 3=medio (operativo), 4=bajo (informativo)
  origen_deteccion        VARCHAR(20) NOT NULL
                          CHECK (origen_deteccion IN ('automatica','manual','cliente','transportista','coordinador')),
  detectada_por_agente    VARCHAR(40),  -- nombre del agente IA si fue auto
  descripcion             TEXT NOT NULL,
  evidencia               JSONB,         -- {fotos: [...], gps: {...}, mensajes: [...]}
  -- Estado
  estado                  VARCHAR(20) DEFAULT 'abierta'
                          CHECK (estado IN ('abierta','en_atencion','escalada','resuelta','cerrada','rechazada')),
  asignada_a              INTEGER REFERENCES usuarios(id),
  escalada_at             TIMESTAMPTZ,
  resuelta_at             TIMESTAMPTZ,
  resuelta_por            INTEGER REFERENCES usuarios(id),
  resolucion              TEXT,
  -- Compensación si aplica
  compensacion_mxn        DECIMAL(12,2),
  compensacion_tipo       VARCHAR(30),    -- 'reembolso_total','reembolso_parcial','descuento_proximo','credito'
  -- Comunicación
  cliente_notificado      BOOLEAN DEFAULT false,
  transportista_notificado BOOLEAN DEFAULT false,
  notas_internas          TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_incidencias_viaje ON incidencias (viaje_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias (estado, severidad, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidencias_abiertas
  ON incidencias (severidad, created_at) WHERE estado IN ('abierta','en_atencion','escalada');

DROP TRIGGER IF EXISTS trg_incidencias_updated ON incidencias;
CREATE TRIGGER trg_incidencias_updated BEFORE UPDATE ON incidencias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────────
-- 7. HISTORIAL DE SCORE (módulo E auditoría)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transportista_score_historial (
  id                      BIGSERIAL PRIMARY KEY,
  transportista_id        INTEGER NOT NULL REFERENCES transportistas_externos(id) ON DELETE CASCADE,
  score_anterior          DECIMAL(6,2),
  score_nuevo             DECIMAL(6,2) NOT NULL,
  delta                   DECIMAL(6,2),
  viaje_id                INTEGER REFERENCES viajes(id),
  motivo                  VARCHAR(80),     -- 'viaje_completado','viaje_fallido','incidencia','manual','recalculo','feedback_cliente'
  detalles                JSONB,           -- desglose de los 5 factores
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_score_hist_transportista
  ON transportista_score_historial (transportista_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 8. UPDATE TIERS: CRITICAL real (15min asignación, 2hr salida)
-- ────────────────────────────────────────────────────────────────
-- El prompt original tenía CRITICAL en 1hr/6hr. Decisiones de arquitectura
-- confirmaron: 15min asignación + 2hr salida (best-effort operativo,
-- SLA legal contractual 4hr para defensa en disputas).
UPDATE vivo_tiers_servicio SET
  sla_recoger_horas = 0.25,             -- 15 minutos
  sla_entregar_horas = 2.0,             -- 2 horas salida
  descripcion = 'Asignación en 15 minutos, salida en 2 horas.'
WHERE codigo = 'CRITICAL';

-- ────────────────────────────────────────────────────────────────
-- 9. CAMPOS DE FEEDBACK EN VIAJES (para fórmula de score)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS feedback_cliente_calif INTEGER
  CHECK (feedback_cliente_calif IS NULL OR (feedback_cliente_calif BETWEEN 1 AND 5));
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS feedback_cliente_comentario TEXT;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS feedback_cliente_at TIMESTAMPTZ;
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS estado_carga_al_llegar VARCHAR(20)
  CHECK (estado_carga_al_llegar IS NULL OR estado_carga_al_llegar IN ('perfecto','menor_daño','daño_moderado','daño_total','no_entregado'));
ALTER TABLE viajes ADD COLUMN IF NOT EXISTS comunicacion_calif INTEGER
  CHECK (comunicacion_calif IS NULL OR (comunicacion_calif BETWEEN 1 AND 5));

-- ────────────────────────────────────────────────────────────────
-- 10. TRIGGER E: score automático fórmula 20/25/15/25/15
-- ────────────────────────────────────────────────────────────────
-- Fórmula:
--   20% cumplimiento_salida   (sla_recoger_real <= sla_recoger_compromiso)
--   25% cumplimiento_entrega  (sla_entregar_real <= sla_entregar_compromiso)
--   15% comunicacion_calif    (1-5 → 0-15)
--   25% estado_carga_al_llegar (perfecto=25, menor=15, moderado=5, total=0, no_entregado=0)
--   15% feedback_cliente_calif (1-5 → 0-15)
--
-- Se ejecuta solo al pasar a 'completado' o 'fallido' (NUNCA en cada UPDATE).
CREATE OR REPLACE FUNCTION calcular_score_viaje_completado(p_viaje_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
  v_viaje                 RECORD;
  v_score                 DECIMAL := 0;
  v_cumple_salida_pct     DECIMAL := 0;
  v_cumple_entrega_pct    DECIMAL := 0;
  v_comunicacion_pct      DECIMAL := 0;
  v_estado_carga_pct      DECIMAL := 0;
  v_feedback_pct          DECIMAL := 0;
  v_score_actual_t        DECIMAL;
  v_score_nuevo_t         DECIMAL;
  v_n_completados         INTEGER;
BEGIN
  SELECT * INTO v_viaje FROM viajes WHERE id = p_viaje_id;
  IF v_viaje IS NULL OR v_viaje.transportista_externo_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1) Cumplimiento salida (20%)
  IF v_viaje.sla_recoger_real IS NOT NULL AND v_viaje.sla_recoger_compromiso IS NOT NULL THEN
    IF v_viaje.sla_recoger_real <= v_viaje.sla_recoger_compromiso THEN
      v_cumple_salida_pct := 20;
    ELSE
      -- Penalización lineal: 1 hora tarde = 10 puntos, 2hr+ = 0
      v_cumple_salida_pct := GREATEST(0,
        20 - (EXTRACT(EPOCH FROM (v_viaje.sla_recoger_real - v_viaje.sla_recoger_compromiso)) / 3600 * 10));
    END IF;
  ELSIF v_viaje.estado = 'fallido' THEN
    v_cumple_salida_pct := 0;
  ELSE
    v_cumple_salida_pct := 10;  -- sin datos: neutral
  END IF;

  -- 2) Cumplimiento entrega (25%)
  IF v_viaje.sla_entregar_real IS NOT NULL AND v_viaje.sla_entregar_compromiso IS NOT NULL THEN
    IF v_viaje.sla_entregar_real <= v_viaje.sla_entregar_compromiso THEN
      v_cumple_entrega_pct := 25;
    ELSE
      v_cumple_entrega_pct := GREATEST(0,
        25 - (EXTRACT(EPOCH FROM (v_viaje.sla_entregar_real - v_viaje.sla_entregar_compromiso)) / 3600 * 10));
    END IF;
  ELSIF v_viaje.estado = 'fallido' THEN
    v_cumple_entrega_pct := 0;
  ELSE
    v_cumple_entrega_pct := 12.5;  -- sin datos: neutral
  END IF;

  -- 3) Comunicación (15%)
  IF v_viaje.comunicacion_calif IS NOT NULL THEN
    v_comunicacion_pct := (v_viaje.comunicacion_calif / 5.0) * 15;
  ELSE
    v_comunicacion_pct := 9;  -- neutral 60%
  END IF;

  -- 4) Estado de la carga (25%)
  v_estado_carga_pct := CASE v_viaje.estado_carga_al_llegar
    WHEN 'perfecto' THEN 25
    WHEN 'menor_daño' THEN 15
    WHEN 'daño_moderado' THEN 5
    WHEN 'daño_total' THEN 0
    WHEN 'no_entregado' THEN 0
    ELSE 15  -- sin datos: neutral
  END;

  -- 5) Feedback cliente (15%)
  IF v_viaje.feedback_cliente_calif IS NOT NULL THEN
    v_feedback_pct := (v_viaje.feedback_cliente_calif / 5.0) * 15;
  ELSE
    v_feedback_pct := 9;  -- neutral 60%
  END IF;

  v_score := v_cumple_salida_pct + v_cumple_entrega_pct + v_comunicacion_pct + v_estado_carga_pct + v_feedback_pct;
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Aplicar al transportista: promedio ponderado con score actual
  -- (más peso a viaje reciente al inicio, más smoothed cuando tienen historial)
  SELECT
    score_automatico,
    COALESCE(total_viajes_completados, 0)
  INTO v_score_actual_t, v_n_completados
  FROM transportistas_externos
  WHERE id = v_viaje.transportista_externo_id;

  -- Weight nuevo viaje: empieza 100%, baja a 10% cuando tiene 30+ viajes
  DECLARE
    v_weight DECIMAL := GREATEST(0.10, 1.0 / GREATEST(v_n_completados + 1, 1));
  BEGIN
    v_score_nuevo_t := (v_score * v_weight) + (COALESCE(v_score_actual_t, 50) * (1 - v_weight));
    v_score_nuevo_t := ROUND(v_score_nuevo_t * 100) / 100;
  END;

  UPDATE transportistas_externos
  SET score_automatico = v_score_nuevo_t,
      updated_at = NOW()
  WHERE id = v_viaje.transportista_externo_id;

  -- Historial
  INSERT INTO transportista_score_historial
    (transportista_id, score_anterior, score_nuevo, delta, viaje_id, motivo, detalles)
  VALUES (
    v_viaje.transportista_externo_id,
    v_score_actual_t,
    v_score_nuevo_t,
    v_score_nuevo_t - COALESCE(v_score_actual_t, 50),
    p_viaje_id,
    CASE WHEN v_viaje.estado = 'fallido' THEN 'viaje_fallido' ELSE 'viaje_completado' END,
    jsonb_build_object(
      'score_viaje', v_score,
      'cumplimiento_salida', v_cumple_salida_pct,
      'cumplimiento_entrega', v_cumple_entrega_pct,
      'comunicacion', v_comunicacion_pct,
      'estado_carga', v_estado_carga_pct,
      'feedback_cliente', v_feedback_pct,
      'estado_viaje', v_viaje.estado
    )
  );

  RETURN v_score_nuevo_t;
END;
$$ LANGUAGE plpgsql;

-- Trigger: dispara solo al cambiar estado a completado/fallido
CREATE OR REPLACE FUNCTION trg_score_viaje_completado()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.estado IN ('Completado','completado','fallido','Fallido'))
     AND (OLD.estado IS NULL OR OLD.estado NOT IN ('Completado','completado','fallido','Fallido'))
     AND NEW.transportista_externo_id IS NOT NULL
  THEN
    PERFORM calcular_score_viaje_completado(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_viajes_score_auto ON viajes;
CREATE TRIGGER trg_viajes_score_auto AFTER UPDATE ON viajes
  FOR EACH ROW EXECUTE FUNCTION trg_score_viaje_completado();

-- ────────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────────
SELECT
  'Migración 004 (planes + cascada + tracking + incidencias + score) aplicada' AS resultado,
  (SELECT COUNT(*)::int FROM transportista_planes) AS planes_seed,
  (SELECT COUNT(*)::int FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'transportista_planes','transportista_suscripciones','transportista_disponibilidad',
       'asignacion_intentos','viaje_tracking','incidencias','transportista_score_historial')
  ) AS tablas_creadas,
  (SELECT codigo || ' sla_recoger=' || sla_recoger_horas || 'h sla_entrega=' || sla_entregar_horas || 'h'
   FROM vivo_tiers_servicio WHERE codigo='CRITICAL') AS critical_actualizado,
  (SELECT COUNT(*)::int FROM pg_proc
   WHERE proname IN ('calcular_score_viaje_completado','trg_score_viaje_completado','auto_crear_suscripcion_basic')) AS funciones_nuevas;
