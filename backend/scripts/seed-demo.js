// ════════════════════════════════════════════════════════════════
// VIVO — Seed de datos demo
// ════════════════════════════════════════════════════════════════
// Inserta clientes, transportistas, leads y viajes de ejemplo para
// que el sistema se vea funcional cuando entras por primera vez.
// ════════════════════════════════════════════════════════════════

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const url = process.env.DATABASE_URL || '';
const necesitaSSL = /railway|rlwy\.net|render|heroku/.test(url) || /sslmode=require/.test(url);

const pool = new Pool({
  connectionString: url,
  ssl: necesitaSSL ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    console.log('1/4 Insertando 3 clientes B2B...');
    const cli = [
      { nombre: 'Lic. Roberto Hernández', empresa: 'Constructora Bajío SA de CV',
        rfc_fiscal: 'CBA850301AB3', razon_social: 'CONSTRUCTORA BAJIO SA DE CV',
        regimen_fiscal: '601', codigo_postal_fiscal: '76140',
        email: 'roberto@constructorabajio.com', telefono: '4421234567',
        tipo: 'constructora' },
      { nombre: 'Ing. Patricia Mendoza', empresa: 'Industrias Cemex Cuautla',
        rfc_fiscal: 'ICE920215X42', razon_social: 'INDUSTRIAS CEMEX CUAUTLA SA',
        regimen_fiscal: '601', codigo_postal_fiscal: '62740',
        email: 'pmendoza@cemexcuautla.mx', telefono: '7351234567',
        tipo: 'industria' },
      { nombre: 'Mtro. Carlos Vega', empresa: 'Logística Express CDMX',
        rfc_fiscal: 'LEC100525MN9', razon_social: 'LOGISTICA EXPRESS CDMX SA DE CV',
        regimen_fiscal: '601', codigo_postal_fiscal: '06600',
        email: 'cvega@logiexpress.mx', telefono: '5512345678',
        tipo: 'broker_socio' },
    ];

    for (const x of cli) {
      await c.query(`
        INSERT INTO clientes (nombre, empresa, rfc_fiscal, razon_social, regimen_fiscal,
          codigo_postal_fiscal, uso_cfdi, email, telefono, tipo)
        VALUES ($1,$2,$3,$4,$5,$6,'G03',$7,$8,$9)
        ON CONFLICT DO NOTHING
      `, [x.nombre, x.empresa, x.rfc_fiscal, x.razon_social, x.regimen_fiscal,
          x.codigo_postal_fiscal, x.email, x.telefono, x.tipo]);
    }

    console.log('2/4 Insertando 5 transportistas externos...');
    const transps = [
      { rs: 'Autotransportes López Hermanos SA', rfc: 'ALH880101AAA', contacto: 'Manuel López',
        tel: '7771234567', email: 'mlopez@autolopez.mx',
        tipos: ['general','fragil'], unidades: ['plataforma_48','caja_seca'],
        zonas: ['morelos','cdmx','edomex'], cal: 4.8, score: 92, verificado: 'verificado' },
      { rs: 'Transportes del Bajío SA de CV', rfc: 'TBA900215BBB', contacto: 'Sofía Ramírez',
        tel: '4422345678', email: 'sramirez@transbajio.com',
        tipos: ['general','refrigerada'], unidades: ['caja_seca','thermo'],
        zonas: ['nacional','bajio','frontera_norte'], cal: 4.5, score: 88, verificado: 'verificado' },
      { rs: 'Fletes Águila Express', rfc: 'FAE950601CCC', contacto: 'Jorge Soto',
        tel: '5523456789', email: 'jsoto@fletesaguila.mx',
        tipos: ['general'], unidades: ['plataforma_48'],
        zonas: ['cdmx','puebla','veracruz'], cal: 4.2, score: 75, verificado: 'verificado' },
      { rs: 'Transportes Especializados Norte', rfc: 'TEN010801DDD', contacto: 'María Castillo',
        tel: '8112345678', email: 'mcastillo@trans-norte.com',
        tipos: ['peligrosa','general'], unidades: ['pipa','plataforma_48'],
        zonas: ['nuevo_leon','frontera_norte'], cal: 4.6, score: 85, verificado: 'verificado' },
      { rs: 'Movimientos Logísticos del Centro', rfc: 'MLC120415EEE', contacto: 'Ricardo Vázquez',
        tel: '5534567890', email: 'rvazquez@movloggico.mx',
        tipos: ['general','fragil','liquidos'], unidades: ['caja_seca','tolva'],
        zonas: ['cdmx','queretaro','morelos'], cal: 4.7, score: 90, verificado: 'pendiente' },
    ];

    for (const t of transps) {
      await c.query(`
        INSERT INTO transportistas_externos
          (razon_social, rfc, contacto_nombre, telefono, email,
           tipos_carga, tipos_unidad, zonas_cobertura,
           comision_pct_acordada, calificacion, score_automatico,
           estado_verificacion, verificado_at, activo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,15,$9,$10,$11::varchar,
          CASE WHEN $11::varchar='verificado' THEN NOW() ELSE NULL END, true)
        ON CONFLICT DO NOTHING
      `, [t.rs, t.rfc, t.contacto, t.tel, t.email, t.tipos, t.unidades, t.zonas, t.cal, t.score, t.verificado]);
    }

    console.log('3/4 Insertando 4 leads de ejemplo...');
    const ahora = new Date();
    const leads = [
      { dias_atras: 2, contacto: 'Lic. Roberto Hernández', empresa: 'Constructora Bajío',
        email: 'roberto@constructorabajio.com', tel: '4421234567',
        origen: 'Querétaro, Qro', destino: 'Cuautla, Mor',
        tipo: 'general', ton: 18, tier: 'EXPRESS', mult: 2.0, precio: 24000,
        estado: 'ganado', transp_idx: 0 },
      { dias_atras: 5, contacto: 'Ing. Patricia Mendoza', empresa: 'Cemex Cuautla',
        email: 'pmendoza@cemexcuautla.mx', tel: '7351234567',
        origen: 'Cuautla, Mor', destino: 'CDMX',
        tipo: 'general', ton: 22, tier: 'CRITICAL', mult: 3.0, precio: 36000,
        estado: 'ganado', transp_idx: 1 },
      { dias_atras: 7, contacto: 'Pedro Salinas', empresa: 'Manufactura Norte',
        email: 'psalinas@manunorte.mx', tel: '8112347788',
        origen: 'Monterrey, NL', destino: 'San Luis Potosí, SLP',
        tipo: 'peligrosa', ton: 25, tier: 'URGENT', mult: 1.5, precio: 18000,
        estado: 'negociando', transp_idx: 3 },
      { dias_atras: 1, contacto: 'Carla Torres', empresa: null,
        email: 'ctorres@frutaslagos.com', tel: '4773344556',
        origen: 'Lagos de Moreno, Jal', destino: 'CDMX',
        tipo: 'refrigerada', ton: 12, tier: 'EXPRESS', mult: 2.0, precio: 28000,
        estado: 'contactado', transp_idx: null },
    ];

    const { rows: clientesDb } = await c.query('SELECT id, nombre FROM clientes');
    const { rows: transpsDb } = await c.query('SELECT id, razon_social FROM transportistas_externos ORDER BY id');

    for (const l of leads) {
      const fecha = new Date(ahora.getTime() - l.dias_atras * 24 * 60 * 60 * 1000);
      const folio = `V${new Date(fecha).getFullYear().toString().slice(-2)}${(new Date(fecha).getMonth()+1).toString().padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;
      const cliente = clientesDb.find(cl => cl.nombre === l.contacto);
      const transp = l.transp_idx != null ? transpsDb[l.transp_idx] : null;
      const precioBase = Math.round(l.precio / l.mult);
      const precioTransp = transp ? Math.round(l.precio * 0.55) : null;
      const comision = transp ? l.precio - precioTransp : null;

      await c.query(`
        INSERT INTO leads (folio, contacto_nombre, empresa, email, telefono,
          origen, destino, tipo_carga, toneladas,
          precio_base, precio_final, tier_urgencia, multiplicador_aplicado,
          estado, tipo_operacion, cliente_id, transportista_externo_id,
          precio_transportista, comision_andreu,
          monto_cobrado_cliente, fecha_primer_cobro, fecha_ultimo_cobro,
          created_at, contactado_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'broker',$15,$16,$17,$18,$19,$20,$20,$21,$21)
        ON CONFLICT (folio) DO NOTHING
      `, [
        folio, l.contacto, l.empresa, l.email, l.tel,
        l.origen, l.destino, l.tipo, l.ton,
        precioBase, l.precio, l.tier, l.mult,
        l.estado, cliente?.id || null, transp?.id || null,
        precioTransp, comision,
        l.estado === 'ganado' ? l.precio : 0,
        l.estado === 'ganado' ? fecha.toISOString().split('T')[0] : null,
        fecha.toISOString(),
      ]);
    }

    // Nota: paso 4 (viaje) omitido porque la tabla viajes tiene schema heredado
    // que requiere ALTER TABLE adicionales. Los leads ganados ya tienen toda la
    // información operativa, suficiente para demo del sistema.

    await c.query('COMMIT');
    console.log('\n✅ Seed completado. Resumen:');

    const stats = await Promise.all([
      c.query("SELECT COUNT(*)::int AS n FROM clientes"),
      c.query("SELECT COUNT(*)::int AS n FROM transportistas_externos WHERE activo=true"),
      c.query("SELECT COUNT(*)::int AS n, COALESCE(SUM(comision_andreu),0)::float AS comision FROM leads WHERE estado='ganado'"),
    ]);
    console.log(`   • Clientes: ${stats[0].rows[0].n}`);
    console.log(`   • Transportistas verificados: ${stats[1].rows[0].n}`);
    console.log(`   • Leads ganados: ${stats[2].rows[0].n} · Comisiones: $${Math.round(stats[2].rows[0].comision).toLocaleString('es-MX')}`);
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('❌ Seed falló:', e.message);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
}

seed();
