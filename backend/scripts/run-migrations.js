#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
// VIVO — Migration Runner
// Corre todos los archivos *.sql en /migrations en orden numérico.
// Idempotente: los CREATE TABLE usan IF NOT EXISTS.
// Lleva tracking en tabla schema_migrations para no re-correr.
// ════════════════════════════════════════════════════════════════

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no definida. Aborto.');
    process.exit(1);
  }

  // Detectar si requiere SSL (Railway/Heroku usan rlwy.net / amazonaws / herokuapp / render)
  const needsSsl = /rlwy\.net|amazonaws|herokuapp|render|supabase/.test(process.env.DATABASE_URL);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    // 1. Asegurar tabla de control
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre   VARCHAR(255) PRIMARY KEY,
        aplicada TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Leer migrations del filesystem en orden numérico
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.warn(`⚠️  Carpeta no encontrada: ${MIGRATIONS_DIR}. Nada que correr.`);
      await pool.end();
      return;
    }
    const archivos = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (!archivos.length) {
      console.log('ℹ️  Sin migrations *.sql en /migrations.');
      await pool.end();
      return;
    }

    // 3. Saber cuáles ya están aplicadas
    const { rows } = await pool.query('SELECT nombre FROM schema_migrations');
    const aplicadas = new Set(rows.map(r => r.nombre));

    let nuevas = 0;
    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) {
        console.log(`✓ ${archivo} (ya aplicada)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, archivo), 'utf8');
      console.log(`⏳ Aplicando ${archivo}...`);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (nombre) VALUES ($1)', [archivo]);
        await client.query('COMMIT');
        console.log(`✅ ${archivo} aplicada`);
        nuevas++;
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`❌ Error en ${archivo}: ${e.message}`);
        throw e;
      } finally {
        client.release();
      }
    }

    if (nuevas === 0) {
      console.log(`\n🎉 Schema VIVO al día. 0 migrations nuevas, ${archivos.length} en total.`);
    } else {
      console.log(`\n🎉 ${nuevas} migration(s) nueva(s) aplicada(s). ${archivos.length} en total.`);
    }
  } catch (e) {
    console.error('💥 Migration runner falló:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
