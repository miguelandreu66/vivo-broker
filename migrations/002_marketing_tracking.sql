-- =============================================
-- VIVO — Migración 002: Marketing tracking + UTMs + campañas
-- =============================================

-- ── Canales de marketing (Google Ads, LinkedIn, etc.) ──
CREATE TABLE IF NOT EXISTS marketing_canales (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(40) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  tipo VARCHAR(40),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO marketing_canales (codigo, nombre, tipo) VALUES
  ('directo',       'Tráfico directo',     'organico'),
  ('google_organic','Google orgánico',     'organico'),
  ('google_ads',    'Google Ads',          'pagado'),
  ('linkedin',      'LinkedIn',            'social'),
  ('whatsapp_grupo','Grupos WhatsApp',     'referido'),
  ('referido',      'Referido por cliente','referido'),
  ('facebook_ads',  'Facebook/Meta Ads',   'pagado'),
  ('otro',          'Otro',                'otro')
ON CONFLICT (codigo) DO NOTHING;

-- ── Campañas de marketing ──
CREATE TABLE IF NOT EXISTS marketing_campanas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  canal VARCHAR(40),
  utm_source VARCHAR(80),
  utm_medium VARCHAR(80),
  utm_campaign VARCHAR(150),
  presupuesto_mensual DECIMAL(12,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  meta_leads_mes INTEGER,
  meta_clientes_mes INTEGER,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_campanas_activo ON marketing_campanas (activo);

-- ── Visitas trackeadas al cotizador público ──
CREATE TABLE IF NOT EXISTS marketing_visitas (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(100),
  ip VARCHAR(50),
  user_agent TEXT,
  evento VARCHAR(40) DEFAULT 'visita',
  utm_source VARCHAR(80),
  utm_medium VARCHAR(80),
  utm_campaign VARCHAR(150),
  utm_content VARCHAR(150),
  utm_term VARCHAR(150),
  referrer TEXT,
  landing_path VARCHAR(300),
  pais VARCHAR(10),
  ciudad VARCHAR(100),
  device_tipo VARCHAR(20),
  navegador VARCHAR(40),
  os VARCHAR(40),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mkt_visitas_session ON marketing_visitas (session_id);
CREATE INDEX IF NOT EXISTS idx_mkt_visitas_fecha ON marketing_visitas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mkt_visitas_canal ON marketing_visitas (utm_source, utm_medium);

-- ── Vista de funnel por canal (últimos 30 días) ──
CREATE OR REPLACE VIEW marketing_funnel_canal AS
SELECT
  COALESCE(utm_source, 'directo') AS canal,
  COUNT(DISTINCT session_id) FILTER (WHERE evento = 'visita') AS visitas_unicas,
  COUNT(*) FILTER (WHERE evento = 'submit_cotizar')::int AS submits,
  COUNT(*) FILTER (WHERE evento = 'lead_creado')::int AS leads_creados,
  (SELECT COUNT(*)::int FROM leads l
   WHERE l.utm_source = mv.utm_source OR (l.utm_source IS NULL AND mv.utm_source IS NULL))
    AS leads_totales,
  CURRENT_DATE AS periodo
FROM marketing_visitas mv
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY utm_source;

-- ── Contenido generado por Atracción IA ──
CREATE TABLE IF NOT EXISTS contenido_generado (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(40) NOT NULL CHECK (tipo IN ('linkedin_post','blog_post','email_boletin','ads_copy','caso_exito','tweet')),
  tema VARCHAR(300),
  titulo VARCHAR(300),
  contenido TEXT,
  cta VARCHAR(200),
  hashtags TEXT[],
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador','aprobado','rechazado','publicado','archivado')),
  modelo_usado VARCHAR(60),
  costo_usd DECIMAL(8,4) DEFAULT 0,
  tokens_usados INTEGER DEFAULT 0,
  url_publicado TEXT,
  fecha_publicacion TIMESTAMPTZ,
  aprobado_por INTEGER REFERENCES usuarios(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contenido_tipo ON contenido_generado (tipo);
CREATE INDEX IF NOT EXISTS idx_contenido_estado ON contenido_generado (estado);

INSERT INTO audit_log (usuario_id, accion, entidad, detalle, ip) VALUES
  (NULL, 'migracion_002', 'sistema',
   jsonb_build_object('migracion','marketing_tracking',
     'tablas', jsonb_build_array('marketing_canales','marketing_campanas','marketing_visitas','contenido_generado'),
     'vistas', jsonb_build_array('marketing_funnel_canal')),
   'migration_script');

SELECT 'Marketing tracking creado OK' AS resultado,
  (SELECT COUNT(*)::int FROM marketing_canales) AS canales_iniciales;
