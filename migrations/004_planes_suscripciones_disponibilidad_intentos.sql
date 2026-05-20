-- =============================================
-- VIVO — Migración 004: Planes + Suscripciones + Disponibilidad + Asignación Intentos
-- =============================================
-- Crea la infraestructura DB para el motor de asignación con cascada
-- (módulo B) y el modelo freemium de transportistas (3 planes).
--
-- Tablas nuevas:
--   1. transportista_planes              (catálogo BASIC/PRO/ELITE)
--   2. transportista_suscripciones       (1 activa por transportista, historial)
--   3. transportista_disponibilidad      (declaración diaria por zona/horario)
--   4. asignacion_intentos               (log cascada con estado_cascada)
--
-- Triggers:
--   - auto_crear_suscripcion_basic AFTER UPDATE transportistas_externos
--     cuando estado_verificacion pasa a 'verificado' → inserta plan BASIC
--   - 3 triggers updated_at en tablas nuevas
--
-- Constraints críticos:
--   - UNIQUE partial: 1 suscripción 'activa' por transportista
--   - CHECK estado_cascada con 6 valores específicos (Decisión 4)
--   - CHECK respuesta SIN 'contraoferta' (Ajuste 1 — en CRITICAL no se negocia)
--
-- Seeds:
--   - 3 planes: BASIC ($0), PRO ($1500), ELITE ($3000)
--   - 4 configs cascada en configuracion_empresa
--
-- Depende de: 003 (set_updated_at, configuracion_empresa)
-- Rollback documentado al final.
-- =============================================


-- ═════════════════════════════════════════════════════════════════
-- 1. CATÁLOGO DE PLANES (transportista_planes)
-- ═════════════════════════════════════════════════════════════════
-- 3 planes seedeados con todos los beneficios mapeados a columnas
-- booleanas para query fácil. El precio_mensual_mxn es lo que cobra
-- Conekta en cada renovación.
CREATE TABLE IF NOT EXISTS transportista_planes (
  codigo                      VARCHAR(20) PRIMARY KEY,
  nombre                      VARCHAR(80) NOT NULL,
  precio_mensual_mxn          DECIMAL(10,2) NOT NULL,
  emoji                       VARCHAR(8),
  descripcion                 TEXT,
  -- Beneficios (booleanos para query rápido + opcionales con valor)
  acceso_pool_critical        BOOLEAN DEFAULT false,
  notificacion_prioritaria    BOOLEAN DEFAULT false,
  badge_verificado            BOOLEAN DEFAULT false,
  soporte_24_7                BOOLEAN DEFAULT false,
  exclusividad_zona           BOOLEAN DEFAULT false,
  pago_acelerado_dias         INTEGER,            -- NULL = pago estándar 15d
  ops_minimas_garantizadas    INTEGER,            -- NULL = sin garantía
  capacitacion_premium        BOOLEAN DEFAULT false,
  -- Display
  orden                       INTEGER DEFAULT 1,
  activo                      BOOLEAN DEFAULT true,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO transportista_planes
  (codigo, nombre, precio_mensual_mxn, emoji, descripcion,
   acceso_pool_critical, notificacion_prioritaria, badge_verificado,
   soporte_24_7, exclusividad_zona, pago_acelerado_dias, ops_minimas_garantizadas,
   capacitacion_premium, orden) VALUES
  ('BASIC', 'VIVO Driver Basic', 0, '🟢',
   'Acceso al pool de operaciones VIVO sin costo. Ves y te postulas a viajes disponibles.',
   false, false, false, false, false, NULL, NULL, false, 1),

  ('PRO', 'VIVO Driver Pro', 1500, '🟡',
   'Notificaciones prioritarias, badge verificado, capacitación premium, soporte 24/7.',
   false, true, true, true, false, NULL, NULL, true, 2),

  ('ELITE', 'VIVO Driver Elite', 3000, '🔴',
   'Acceso al pool CRITICAL, exclusividad de zona, garantía mínima 3 ops/mes, pago acelerado 7 días.',
   true, true, true, true, true, 7, 3, true, 3)
ON CONFLICT (codigo) DO NOTHING;


-- ═════════════════════════════════════════════════════════════════
-- 2. SUSCRIPCIONES (transportista_suscripciones)
-- ═════════════════════════════════════════════════════════════════
-- Una fila por suscripción (no por transportista). El historial queda
-- intacto: si un transportista upgrade de PRO a ELITE, se cancela la
-- PRO (estado='cancelada') y se crea ELITE (estado='activa').
--
-- Constraint crítico: solo 1 activa por transportista (UNIQUE partial).
CREATE TABLE IF NOT EXISTS transportista_suscripciones (
  id                          BIGSERIAL PRIMARY KEY,
  transportista_id            INTEGER NOT NULL
                              REFERENCES transportistas_externos(id) ON DELETE CASCADE,
  plan_codigo                 VARCHAR(20) NOT NULL
                              REFERENCES transportista_planes(codigo),
  estado                      VARCHAR(20) NOT NULL DEFAULT 'activa'
                              CHECK (estado IN ('activa','pausada','cancelada','suspendida_pago','vencida')),
  inicio_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fin_at                      TIMESTAMPTZ,         -- NULL = activa hoy
  proximo_cobro_at            TIMESTAMPTZ,         -- vencimiento ciclo actual
  ultimo_cobro_at             TIMESTAMPTZ,
  ultimo_cobro_monto_mxn      DECIMAL(10,2),
  fallos_cobro_consecutivos   INTEGER DEFAULT 0,
  -- Integración pagos (Conekta — Decisión 8)
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

-- Constraint clave: solo 1 suscripción ACTIVA por transportista
CREATE UNIQUE INDEX IF NOT EXISTS uniq_susc_activa_por_transportista
  ON transportista_suscripciones (transportista_id)
  WHERE estado = 'activa';

-- Índices de query
CREATE INDEX IF NOT EXISTS idx_susc_transportista
  ON transportista_suscripciones (transportista_id, estado);
CREATE INDEX IF NOT EXISTS idx_susc_proximo_cobro
  ON transportista_suscripciones (proximo_cobro_at)
  WHERE estado = 'activa';
CREATE INDEX IF NOT EXISTS idx_susc_customer_externo
  ON transportista_suscripciones (customer_id_externo)
  WHERE customer_id_externo IS NOT NULL;

DROP TRIGGER IF EXISTS trg_susc_updated ON transportista_suscripciones;
CREATE TRIGGER trg_susc_updated
  BEFORE UPDATE ON transportista_suscripciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═════════════════════════════════════════════════════════════════
-- 3. AUTO-SUSCRIPCIÓN BASIC AL VERIFICAR TRANSPORTISTA
-- ═════════════════════════════════════════════════════════════════
-- Cuando un transportista pasa a estado_verificacion='verificado',
-- automáticamente se le asigna plan BASIC (cortesía, $0/mes).
--
-- El transportista puede después hacer upgrade a PRO o ELITE
-- desde su panel (que llamará a Conekta para crear la subscripción
-- cobrable).
CREATE OR REPLACE FUNCTION auto_crear_suscripcion_basic()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo dispara cuando pasa A verificado (no si ya estaba o si cambia entre otros estados)
  IF NEW.estado_verificacion = 'verificado'
     AND (OLD.estado_verificacion IS NULL OR OLD.estado_verificacion != 'verificado')
  THEN
    -- Insertar BASIC solo si no tiene suscripción activa ya
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
CREATE TRIGGER trg_auto_susc_basic
  AFTER UPDATE ON transportistas_externos
  FOR EACH ROW EXECUTE FUNCTION auto_crear_suscripcion_basic();


-- ═════════════════════════════════════════════════════════════════
-- 4. DISPONIBILIDAD DECLARADA (transportista_disponibilidad)
-- ═════════════════════════════════════════════════════════════════
-- Cada transportista declara cuándo y dónde está disponible:
-- por fecha + ventana horaria + zonas + tipos de unidad + flags por tier.
--
-- El motor de asignación (módulo B) consulta esta tabla para filtrar
-- candidatos. Sin declaración del día = no candidato.
CREATE TABLE IF NOT EXISTS transportista_disponibilidad (
  id                          BIGSERIAL PRIMARY KEY,
  transportista_id            INTEGER NOT NULL
                              REFERENCES transportistas_externos(id) ON DELETE CASCADE,
  fecha                       DATE NOT NULL,
  hora_desde                  TIME DEFAULT '00:00',
  hora_hasta                  TIME DEFAULT '23:59',
  zonas                       TEXT[] DEFAULT '{}',     -- ['cdmx','toluca','puebla','queretaro','cuernavaca']
  tipos_unidad                TEXT[] DEFAULT '{}',     -- ['caja_seca','plataforma','refrigerado','tracto']
  unidades_disponibles        INTEGER DEFAULT 1,
  -- Flags por tier (motor de cascada los respeta)
  acepta_critical             BOOLEAN DEFAULT false,   -- solo válido si plan = ELITE
  acepta_express              BOOLEAN DEFAULT true,
  acepta_urgent               BOOLEAN DEFAULT true,
  notas                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disp_fecha
  ON transportista_disponibilidad (fecha, transportista_id);
CREATE INDEX IF NOT EXISTS idx_disp_zonas
  ON transportista_disponibilidad USING GIN (zonas);
CREATE INDEX IF NOT EXISTS idx_disp_tipos_unidad
  ON transportista_disponibilidad USING GIN (tipos_unidad);
CREATE INDEX IF NOT EXISTS idx_disp_transportista_fecha
  ON transportista_disponibilidad (transportista_id, fecha);

DROP TRIGGER IF EXISTS trg_disp_updated ON transportista_disponibilidad;
CREATE TRIGGER trg_disp_updated
  BEFORE UPDATE ON transportista_disponibilidad
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═════════════════════════════════════════════════════════════════
-- 5. INTENTOS DE ASIGNACIÓN CON CASCADA (asignacion_intentos)
-- ═════════════════════════════════════════════════════════════════
-- Log de cada notificación que el motor de cascada manda a un
-- transportista candidato. Una fila = un (lead, transportista, anillo).
--
-- Columna CLAVE: estado_cascada (Decisión 4) — 6 valores específicos.
-- Updates atómicos con `... WHERE estado_cascada = 'X'` para evitar
-- race conditions cuando varios procesos chequean expiration al mismo
-- tiempo (migración futura a BullMQ post-200 ops/mes).
--
-- Cascada de canales (Decisión 3 ajustada):
--   1. enviado_at = WhatsApp inicial
--   2. Si en 90s NO responde: SMS fallback en sms_fallback_enviado_at
--   3. Sigue notificado hasta que: respondio_at NOT NULL, expirado, o cancelado.
--
-- IMPORTANTE: la columna `respuesta` NO incluye 'contraoferta'
-- (Ajuste 1: en CRITICAL no se negocia precio, se pierden los 15min SLA).
CREATE TABLE IF NOT EXISTS asignacion_intentos (
  id                          BIGSERIAL PRIMARY KEY,
  lead_id                     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  viaje_id                    INTEGER REFERENCES viajes(id) ON DELETE SET NULL,
  asignacion_ia_id            BIGINT REFERENCES asignaciones_ia(id) ON DELETE SET NULL,
  transportista_id            INTEGER NOT NULL REFERENCES transportistas_externos(id),

  -- Anillo de cascada (1=top scoring, 2=segundo grupo, 3=pool general)
  anillo                      INTEGER NOT NULL DEFAULT 1
                              CHECK (anillo BETWEEN 1 AND 5),

  -- ESTADO_CASCADA (Decisión 4) — 6 valores únicos
  estado_cascada              VARCHAR(30) NOT NULL DEFAULT 'pendiente'
                              CHECK (estado_cascada IN (
                                'pendiente',
                                'anillo1_notificado',
                                'anillo2_notificado',
                                'escalado_humano',
                                'aceptado',
                                'cancelado'
                              )),

  -- Notificación primaria (WhatsApp)
  canal                       VARCHAR(20) NOT NULL DEFAULT 'whatsapp'
                              CHECK (canal IN ('whatsapp','sms','push','email','llamada')),
  canal_id_externo            VARCHAR(100),         -- Twilio MessageSid del WhatsApp
  enviado_at                  TIMESTAMPTZ DEFAULT NOW(),

  -- Fallback SMS (Decisión 3: si no responde en 90s)
  sms_fallback_enviado_at     TIMESTAMPTZ,
  sms_fallback_id_externo     VARCHAR(100),

  -- Respuesta del transportista
  respondio_at                TIMESTAMPTZ,
  respuesta                   VARCHAR(20)
                              CHECK (respuesta IN (
                                'acepta',
                                'rechaza',
                                'no_responde',
                                'expirado',
                                'seleccionado_otro'
                                -- NOTA: 'contraoferta' NO incluida (Ajuste 1)
                                -- En CRITICAL el precio es fijo (3x), no se negocia
                              )),
  notas_respuesta             TEXT,

  -- Resolución global del lead
  fue_seleccionado            BOOLEAN DEFAULT false,

  -- Justificación del scoring
  score_al_intento            DECIMAL(6,2),
  motivo_seleccion            TEXT,

  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intentos_lead
  ON asignacion_intentos (lead_id, anillo, enviado_at);
CREATE INDEX IF NOT EXISTS idx_intentos_transportista
  ON asignacion_intentos (transportista_id, enviado_at DESC);
CREATE INDEX IF NOT EXISTS idx_intentos_cascada
  ON asignacion_intentos (estado_cascada, enviado_at)
  WHERE estado_cascada IN ('anillo1_notificado','anillo2_notificado');
CREATE INDEX IF NOT EXISTS idx_intentos_sin_respuesta
  ON asignacion_intentos (enviado_at)
  WHERE respondio_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_intentos_sms_pendiente
  ON asignacion_intentos (enviado_at)
  WHERE respondio_at IS NULL AND sms_fallback_enviado_at IS NULL;

DROP TRIGGER IF EXISTS trg_intentos_updated ON asignacion_intentos;
CREATE TRIGGER trg_intentos_updated
  BEFORE UPDATE ON asignacion_intentos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═════════════════════════════════════════════════════════════════
-- 6. CONFIGURACIONES DE CASCADA (configuracion_empresa)
-- ═════════════════════════════════════════════════════════════════
-- Timeouts y toggles del motor de asignación. Editables desde UI.
INSERT INTO configuracion_empresa (clave, valor, descripcion) VALUES
  ('asignacion_engine_version',
   '1',
   'Toggle Decisión 2: 1=asignadorIA.js v1 (heredado), 2=asignacionEngine.js v2 (cascada). NUNCA disparar ambos.'),

  ('cascada_timeout_sms_fallback_seg',
   '90',
   'Decisión 3: si transportista no responde WhatsApp en N seg, agregar SMS al mismo candidato'),

  ('cascada_timeout_anillo1_seg',
   '300',
   'Decisión 4: tras N seg sin acepta, expirar anillo 1 y notificar anillo 2'),

  ('cascada_timeout_anillo2_seg',
   '600',
   'Tras N seg total sin acepta, expirar anillo 2 y notificar anillo 3 (pool general)'),

  ('cascada_timeout_anillo3_seg',
   '900',
   'Tras N seg total sin acepta, ESCALAR a coordinador humano (WhatsApp + SMS)'),

  ('cascada_top_n_anillo1',
   '3',
   'Cuántos top-candidatos notificar simultáneamente en anillo 1'),

  ('cascada_top_n_anillo2',
   '5',
   'Cuántos del anillo 2 notificar simultáneamente'),

  ('cascada_pool_general_max',
   '200',
   'Límite duro de cuántos transportistas notificar en anillo 3 (control de costos WhatsApp)')

ON CONFLICT (clave) DO NOTHING;


-- ═════════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═════════════════════════════════════════════════════════════════
SELECT
  'Migración 004 (planes + suscripciones + disponibilidad + intentos) aplicada' AS resultado,

  (SELECT COUNT(*)::int FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'transportista_planes','transportista_suscripciones',
       'transportista_disponibilidad','asignacion_intentos'
     )
  ) AS tablas_creadas,

  (SELECT COUNT(*)::int FROM transportista_planes) AS planes_seed,

  (SELECT COUNT(*)::int FROM pg_proc
   WHERE proname = 'auto_crear_suscripcion_basic'
  ) AS funcion_auto_susc,

  (SELECT COUNT(*)::int FROM pg_trigger
   WHERE tgname IN (
     'trg_auto_susc_basic','trg_susc_updated',
     'trg_disp_updated','trg_intentos_updated'
   )
  ) AS triggers_nuevos,

  (SELECT COUNT(*)::int FROM configuracion_empresa
   WHERE clave LIKE 'cascada_%' OR clave = 'asignacion_engine_version'
  ) AS configs_cascada,

  -- Verificar que respuesta NO incluye 'contraoferta'
  NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%respuesta%'
      AND check_clause LIKE '%contraoferta%'
  ) AS sin_contraoferta_check;


-- =============================================
-- ROLLBACK (documentado, NO ejecutar salvo emergencia)
-- =============================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_auto_susc_basic     ON transportistas_externos;
-- DROP TRIGGER IF EXISTS trg_susc_updated        ON transportista_suscripciones;
-- DROP TRIGGER IF EXISTS trg_disp_updated        ON transportista_disponibilidad;
-- DROP TRIGGER IF EXISTS trg_intentos_updated    ON asignacion_intentos;
-- DROP FUNCTION IF EXISTS auto_crear_suscripcion_basic() CASCADE;
-- DROP TABLE IF EXISTS asignacion_intentos              CASCADE;
-- DROP TABLE IF EXISTS transportista_disponibilidad     CASCADE;
-- DROP TABLE IF EXISTS transportista_suscripciones      CASCADE;
-- DROP TABLE IF EXISTS transportista_planes             CASCADE;
-- DELETE FROM configuracion_empresa
--   WHERE clave LIKE 'cascada_%' OR clave = 'asignacion_engine_version';
-- COMMIT;
--
-- ⚠️ Tras rollback: si ya hay transportistas con suscripción Pro/Elite
-- cobrada por Conekta, NO rollback sin primero reembolsar manualmente.
-- En este momento (mes 1) solo hay 4 BASIC cortesía: rollback seguro.
