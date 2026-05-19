-- =============================================
-- VIVO — Schema inicial completo
-- =============================================
-- Brokerage de urgencias logísticas con 12 agentes IA.
-- "Tu carga, VIVO."
-- =============================================

-- ── Usuarios + Roles ──
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  rol VARCHAR(30) NOT NULL DEFAULT 'caja'
    CHECK (rol IN ('director','admin','caja','logistica','monitoreo','operador')),
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audit log ──
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  accion VARCHAR(80) NOT NULL,
  entidad VARCHAR(60),
  entidad_id BIGINT,
  detalle JSONB,
  ip VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_log (created_at DESC);

-- ── Configuración empresa (incluye BYOK keys cifradas) ──
CREATE TABLE IF NOT EXISTS configuracion_empresa (
  clave VARCHAR(80) PRIMARY KEY,
  valor TEXT,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Configs base de VIVO ──
INSERT INTO configuracion_empresa (clave, valor, descripcion) VALUES
  ('app_nombre', 'VIVO', 'Nombre de la app'),
  ('app_eslogan', 'Tu carga, VIVO.', 'Eslogan oficial'),
  ('app_url_publica', 'vivocargo.com', 'Dominio público'),
  ('app_color_primario', '#FF6B35', 'Naranja eléctrico'),
  ('app_color_secundario', '#0A0A0A', 'Negro profundo'),
  ('fiscal_rfc', '', 'RFC del emisor'),
  ('fiscal_razon_social', '', 'Razón social emisor'),
  ('fiscal_regimen_fiscal', '601', 'Régimen fiscal SAT'),
  ('fiscal_codigo_postal', '62000', 'CP lugar expedición'),
  ('fiscal_serie_cfdi', 'V', 'Serie CFDI (V de VIVO)'),
  ('fiscal_pac_proveedor', 'facturama', 'PAC'),
  ('fiscal_pac_modo', 'sandbox', 'Modo PAC: sandbox | produccion')
ON CONFLICT (clave) DO NOTHING;

-- ── Clientes B2B ──
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  empresa VARCHAR(200),
  rfc_fiscal VARCHAR(20),
  razon_social VARCHAR(200),
  regimen_fiscal VARCHAR(10),
  codigo_postal_fiscal VARCHAR(10),
  uso_cfdi VARCHAR(10) DEFAULT 'G03',
  email VARCHAR(200),
  email_facturacion VARCHAR(200),
  telefono VARCHAR(50),
  direccion TEXT,
  tipo VARCHAR(50) DEFAULT 'empresa',
  estado VARCHAR(30) DEFAULT 'activo',
  notas TEXT,
  creado_por INTEGER REFERENCES usuarios(id),
  bloqueado_por_mora BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Transportistas externos (red broker) ──
CREATE TABLE IF NOT EXISTS transportistas_externos (
  id SERIAL PRIMARY KEY,
  razon_social VARCHAR(200) NOT NULL,
  nombre_comercial VARCHAR(200),
  rfc VARCHAR(20),
  contacto_nombre VARCHAR(150),
  telefono VARCHAR(50),
  email VARCHAR(200),
  tipos_carga TEXT[] DEFAULT '{}',
  tipos_unidad TEXT[] DEFAULT '{}',
  zonas_cobertura TEXT[] DEFAULT '{}',
  comision_pct_acordada DECIMAL(5,2) DEFAULT 15,
  condiciones_pago VARCHAR(100),
  calificacion DECIMAL(3,2) DEFAULT 3.0,
  total_viajes INTEGER DEFAULT 0,
  total_viajes_completados INTEGER DEFAULT 0,
  total_incidentes INTEGER DEFAULT 0,
  score_automatico DECIMAL(5,2) DEFAULT 50,
  estado_verificacion VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado_verificacion IN ('pendiente','en_revision','verificado','rechazado','suspendido')),
  verificado_at TIMESTAMPTZ,
  verificado_por INTEGER REFERENCES usuarios(id),
  motivo_rechazo TEXT,
  fecha_proxima_revision DATE,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transportista_documentos (
  id BIGSERIAL PRIMARY KEY,
  transportista_id INTEGER NOT NULL REFERENCES transportistas_externos(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  archivo_bytes BYTEA,
  mime_type VARCHAR(80),
  tamano_bytes BIGINT,
  vigencia_inicio DATE,
  vigencia_fin DATE,
  alertar_dias_antes INTEGER DEFAULT 30,
  notas TEXT,
  subido_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tiers VIVO ──
CREATE TABLE IF NOT EXISTS vivo_tiers_servicio (
  codigo VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(60),
  emoji VARCHAR(8),
  descripcion TEXT,
  multiplicador DECIMAL(4,2),
  sla_recoger_horas DECIMAL(4,2),
  sla_entregar_horas DECIMAL(5,2),
  garantia_descripcion TEXT,
  garantia_reembolso_pct DECIMAL(5,2),
  color_hex VARCHAR(10),
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 1
);
INSERT INTO vivo_tiers_servicio
  (codigo, nombre, emoji, descripcion, multiplicador, sla_recoger_horas, sla_entregar_horas, garantia_descripcion, garantia_reembolso_pct, color_hex, orden) VALUES
  ('CRITICAL','Critical','🚨','Recogemos en 1h, entregamos en 4-6h.',3.0,1.0,6.0,'100% reembolso si fallamos',100.0,'#DC2626',1),
  ('EXPRESS','Express','⚡','Mismo día garantizado.',2.0,2.0,12.0,'50% reembolso si fallamos',50.0,'#F59E0B',2),
  ('URGENT','Urgent','🔥','Next day antes 8am.',1.5,4.0,24.0,'20% descuento próximo viaje',20.0,'#3B82F6',3)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS vivo_servicios_anexos (
  codigo VARCHAR(40) PRIMARY KEY,
  nombre VARCHAR(120),
  emoji VARCHAR(8),
  descripcion TEXT,
  precio_default DECIMAL(10,2),
  margen_pct DECIMAL(5,2),
  recomendar_para_tier TEXT[],
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 1
);
INSERT INTO vivo_servicios_anexos
  (codigo, nombre, emoji, descripcion, precio_default, margen_pct, recomendar_para_tier, orden) VALUES
  ('seguro_carga_premium','Seguro de carga premium $1M','🛡️','Cobertura adicional $1M MXN',3500,75,ARRAY['CRITICAL','EXPRESS','URGENT'],1),
  ('custodia_armada','Custodia armada','👮','Acompañamiento seguridad privada',8000,30,ARRAY['CRITICAL'],2),
  ('tracking_vip','Tracking VIP con cámara','📹','Cámara en cabina + GPS premium',2000,80,ARRAY['CRITICAL','EXPRESS'],3),
  ('embalaje_reforzado','Embalaje industrial reforzado','📦','Para mercancía frágil',2000,60,ARRAY['CRITICAL','EXPRESS','URGENT'],4),
  ('reporte_ejecutivo','Reporte ejecutivo post-entrega','📊','Reporte con fotos y métricas',1500,90,ARRAY['CRITICAL','EXPRESS','URGENT'],5)
ON CONFLICT (codigo) DO NOTHING;

-- ── Leads + conversaciones ──
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  folio VARCHAR(30) UNIQUE NOT NULL,
  contacto_nombre VARCHAR(200) NOT NULL,
  empresa VARCHAR(300),
  rfc VARCHAR(20),
  email VARCHAR(200),
  telefono VARCHAR(50),
  origen VARCHAR(300),
  destino VARCHAR(300),
  origen_lat DECIMAL(10,7),
  origen_lng DECIMAL(10,7),
  destino_lat DECIMAL(10,7),
  destino_lng DECIMAL(10,7),
  origen_codigo_postal VARCHAR(10),
  destino_codigo_postal VARCHAR(10),
  toneladas DECIMAL(10,2),
  tipo_carga VARCHAR(40),
  fecha_solicitada DATE,
  recurrencia VARCHAR(40),
  servicios_extras JSONB,
  comentarios TEXT,
  distancia_km DECIMAL(10,2),
  duracion_horas DECIMAL(6,2),
  -- Precios
  precio_base DECIMAL(12,2),
  precio_recargos DECIMAL(12,2),
  precio_descuentos DECIMAL(12,2),
  precio_extras DECIMAL(12,2),
  precio_final DECIMAL(12,2),
  precio_transportista DECIMAL(12,2),
  comision_andreu DECIMAL(12,2),
  costo_estimado DECIMAL(12,2),
  margen_pct DECIMAL(5,2),
  -- VIVO tier
  tier_urgencia VARCHAR(20),
  multiplicador_aplicado DECIMAL(4,2),
  sla_entrega_compromiso TIMESTAMPTZ,
  servicios_anexos JSONB DEFAULT '[]',
  precio_anexos DECIMAL(12,2) DEFAULT 0,
  garantia_aplicada TEXT,
  -- Workflow broker
  estado VARCHAR(30) DEFAULT 'nuevo',
  tipo_operacion VARCHAR(20) DEFAULT 'broker',
  transportista_externo_id INTEGER REFERENCES transportistas_externos(id),
  cliente_id INTEGER REFERENCES clientes(id),
  viaje_id INTEGER,
  monto_cobrado_cliente DECIMAL(12,2) DEFAULT 0,
  fecha_primer_cobro DATE,
  fecha_ultimo_cobro DATE,
  -- UTM tracking
  utm_source VARCHAR(80),
  utm_medium VARCHAR(80),
  utm_campaign VARCHAR(150),
  utm_content VARCHAR(150),
  utm_term VARCHAR(150),
  referrer TEXT,
  landing_path VARCHAR(300),
  -- Audit
  desglose JSONB,
  modelo_usado VARCHAR(40),
  contactado_at TIMESTAMPTZ,
  contactado_por INTEGER REFERENCES usuarios(id),
  notas_internas TEXT,
  motivo_perdido TEXT,
  generado_por_ip VARCHAR(80),
  generado_por_ua VARCHAR(500),
  generado_por_origen VARCHAR(40),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads (estado);
CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads (tier_urgencia);

CREATE OR REPLACE FUNCTION generar_folio_lead() RETURNS VARCHAR AS $$
DECLARE v_folio VARCHAR;
BEGIN
  v_folio := 'V' || to_char(now(), 'YYMM') || '-' || lpad(nextval('leads_id_seq')::text, 4, '0');
  RETURN v_folio;
END;
$$ LANGUAGE plpgsql;

-- ── Viajes broker ──
CREATE TABLE IF NOT EXISTS viajes (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  cliente_id INTEGER REFERENCES clientes(id),
  transportista_externo_id INTEGER REFERENCES transportistas_externos(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  origen VARCHAR(300),
  destino VARCHAR(300),
  origen_codigo_postal VARCHAR(10),
  destino_codigo_postal VARCHAR(10),
  carga VARCHAR(200),
  tipo_carga VARCHAR(40),
  descripcion_mercancia TEXT,
  toneladas DECIMAL(10,2),
  peso_bruto_total_kg DECIMAL(12,3),
  km_recorridos DECIMAL(10,2),
  distancia_km DECIMAL(10,2),
  material_peligroso BOOLEAN DEFAULT false,
  cve_material_peligroso VARCHAR(20),
  clave_producto_servicio_sat VARCHAR(20) DEFAULT '78101800',
  clave_unidad_peso_sat VARCHAR(10) DEFAULT 'KGM',
  tier_urgencia VARCHAR(20),
  sla_recoger_compromiso TIMESTAMPTZ,
  sla_entregar_compromiso TIMESTAMPTZ,
  sla_recoger_real TIMESTAMPTZ,
  sla_entregar_real TIMESTAMPTZ,
  sla_cumplido BOOLEAN,
  servicios_anexos_aplicados JSONB DEFAULT '[]',
  monto_cobrado_cliente DECIMAL(12,2),
  monto_pagado_transportista DECIMAL(12,2),
  comision_andreu DECIMAL(12,2),
  estado VARCHAR(40) DEFAULT 'Programado',
  notas TEXT,
  facturado BOOLEAN DEFAULT false,
  cfdi_id BIGINT,
  registrado_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CFDI (mismo schema que en Andreu) ──
CREATE TABLE IF NOT EXISTS cfdi_emitidos (
  id BIGSERIAL PRIMARY KEY,
  viaje_id INTEGER REFERENCES viajes(id) ON DELETE SET NULL,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  serie VARCHAR(10) NOT NULL,
  folio INTEGER NOT NULL,
  uuid_fiscal VARCHAR(40),
  fecha_emision TIMESTAMPTZ,
  tipo_comprobante VARCHAR(2) DEFAULT 'I',
  forma_pago VARCHAR(5),
  metodo_pago VARCHAR(5),
  uso_cfdi VARCHAR(10),
  moneda VARCHAR(5) DEFAULT 'MXN',
  tipo_cambio DECIMAL(10,4) DEFAULT 1,
  subtotal DECIMAL(14,2),
  total_iva DECIMAL(14,2) DEFAULT 0,
  total_retenciones DECIMAL(14,2) DEFAULT 0,
  total DECIMAL(14,2),
  receptor_rfc VARCHAR(20),
  receptor_razon_social VARCHAR(200),
  receptor_regimen VARCHAR(10),
  receptor_cp VARCHAR(10),
  receptor_email VARCHAR(200),
  tiene_carta_porte BOOLEAN DEFAULT false,
  origen_cp VARCHAR(10),
  destino_cp VARCHAR(10),
  distancia_km DECIMAL(10,3),
  peso_bruto_kg DECIMAL(12,3),
  estado VARCHAR(20) DEFAULT 'borrador',
  pac_proveedor VARCHAR(20),
  pac_modo VARCHAR(20),
  pac_respuesta JSONB,
  error_mensaje TEXT,
  xml_bytes BYTEA,
  pdf_bytes BYTEA,
  motivo_cancelacion VARCHAR(10),
  acuse_cancelacion JSONB,
  cancelado_at TIMESTAMPTZ,
  cancelado_por INTEGER REFERENCES usuarios(id),
  enviado_cliente BOOLEAN DEFAULT false,
  enviado_cliente_at TIMESTAMPTZ,
  enviado_canales TEXT[],
  emitido_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cfdi_conceptos (
  id BIGSERIAL PRIMARY KEY,
  cfdi_id BIGINT REFERENCES cfdi_emitidos(id) ON DELETE CASCADE,
  clave_prod_serv VARCHAR(20),
  clave_unidad VARCHAR(10),
  descripcion TEXT,
  cantidad DECIMAL(12,4) DEFAULT 1,
  valor_unitario DECIMAL(14,2),
  importe DECIMAL(14,2),
  descuento DECIMAL(14,2) DEFAULT 0,
  base_iva DECIMAL(14,2),
  tasa_iva DECIMAL(8,6) DEFAULT 0.16,
  importe_iva DECIMAL(14,2),
  es_carta_porte BOOLEAN DEFAULT false,
  orden_idx INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cfdi_eventos (
  id BIGSERIAL PRIMARY KEY,
  cfdi_id BIGINT REFERENCES cfdi_emitidos(id) ON DELETE CASCADE,
  evento VARCHAR(40),
  detalle JSONB,
  usuario_id INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Agentes IA — log de invocaciones ──
CREATE TABLE IF NOT EXISTS agentes_invocaciones (
  id BIGSERIAL PRIMARY KEY,
  nombre_agente VARCHAR(40) NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  mensaje TEXT,
  respuesta TEXT,
  iteraciones INTEGER DEFAULT 1,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cache_read INTEGER DEFAULT 0,
  cache_creation INTEGER DEFAULT 0,
  costo_usd DECIMAL(10,6) DEFAULT 0,
  duracion_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agentes_inv_nombre ON agentes_invocaciones (nombre_agente, created_at DESC);

-- ── Cashflow broker (vistas) ──
CREATE TABLE IF NOT EXISTS broker_pagos_transportista (
  id BIGSERIAL PRIMARY KEY,
  transportista_externo_id INTEGER NOT NULL REFERENCES transportistas_externos(id),
  lead_id INTEGER REFERENCES leads(id),
  viaje_id INTEGER REFERENCES viajes(id),
  concepto VARCHAR(200),
  monto DECIMAL(12,2),
  fecha_programada DATE,
  fecha_pagada DATE,
  estado VARCHAR(20) DEFAULT 'programado',
  metodo VARCHAR(30),
  referencia VARCHAR(80),
  notas TEXT,
  creado_por INTEGER REFERENCES usuarios(id),
  pagado_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW broker_cashflow_exposicion AS
SELECT
  COUNT(*) FILTER (WHERE l.estado = 'ganado')::int AS operaciones_activas,
  COALESCE(SUM(l.precio_final) FILTER (WHERE l.estado = 'ganado'), 0)::float AS total_facturar_cliente,
  COALESCE(SUM(l.monto_cobrado_cliente) FILTER (WHERE l.estado = 'ganado'), 0)::float AS total_cobrado_cliente,
  COALESCE(SUM(l.precio_final - l.monto_cobrado_cliente) FILTER (WHERE l.estado = 'ganado'), 0)::float AS pendiente_cobrar_cliente,
  COALESCE(SUM(l.precio_transportista) FILTER (WHERE l.estado = 'ganado'), 0)::float AS total_pagar_transportista,
  COALESCE((SELECT SUM(monto) FROM broker_pagos_transportista WHERE estado='pagado'), 0)::float AS total_pagado_transportista,
  COALESCE((SELECT SUM(monto) FROM broker_pagos_transportista WHERE estado='programado'), 0)::float AS pendiente_pagar_transportista,
  0::float AS exposicion_neta
FROM leads l
WHERE l.tipo_operacion = 'broker';

CREATE OR REPLACE VIEW broker_concentracion_clientes AS
WITH ventana AS (
  SELECT COALESCE(empresa, contacto_nombre) AS empresa,
         contacto_nombre AS cliente,
         SUM(precio_final)::float AS volumen_trimestre,
         COUNT(*)::int AS operaciones
  FROM leads
  WHERE tipo_operacion='broker' AND estado='ganado'
    AND created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY empresa, contacto_nombre
), total AS (SELECT SUM(volumen_trimestre) AS t FROM ventana)
SELECT v.empresa, v.cliente, v.volumen_trimestre, v.operaciones,
       CASE WHEN t.t > 0 THEN (v.volumen_trimestre/t.t*100)::float ELSE 0 END AS pct_volumen
FROM ventana v, total t ORDER BY v.volumen_trimestre DESC;

CREATE OR REPLACE VIEW broker_concentracion_transportistas AS
WITH ventana AS (
  SELECT l.transportista_externo_id AS transportista_id,
         t.razon_social AS transportista,
         SUM(l.precio_transportista)::float AS volumen_trimestre,
         COUNT(*)::int AS operaciones
  FROM leads l JOIN transportistas_externos t ON t.id = l.transportista_externo_id
  WHERE l.tipo_operacion='broker' AND l.estado='ganado'
    AND l.created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY l.transportista_externo_id, t.razon_social
), total AS (SELECT SUM(volumen_trimestre) AS t FROM ventana)
SELECT v.*, CASE WHEN t.t > 0 THEN (v.volumen_trimestre/t.t*100)::float ELSE 0 END AS pct_volumen
FROM ventana v, total t ORDER BY v.volumen_trimestre DESC;

-- ── Función para broker_marcar_vencidos ──
CREATE OR REPLACE FUNCTION broker_marcar_vencidos() RETURNS INTEGER AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE broker_pagos_transportista
  SET estado='vencido', updated_at=NOW()
  WHERE estado='programado' AND fecha_programada < CURRENT_DATE;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$ LANGUAGE plpgsql;

-- ── Usuario inicial (director) ──
-- password = 'cambiar_inmediatamente' (bcryptjs 10 rounds)
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Miguel Cantoran Andreu', 'miguel@vivocargo.com',
   '$2a$10$8K3W7lQX5xV3Hk1y6BzxRu4eJzKjK6Y9qVcL2NhT0fW8a1mP3R7yi',
   'director')
ON CONFLICT (email) DO NOTHING;

SELECT 'Schema VIVO inicial creado' AS resultado,
  (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema='public') AS tablas;
