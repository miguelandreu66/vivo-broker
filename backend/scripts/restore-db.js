#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
// VIVO — Restore desde backup JSON.gz
//
// USO:
//   node scripts/restore-db.js --file=backups/vivo-2026-05-19.json.gz
//   node scripts/restore-db.js --file=... --solo=leads   (solo 1 tabla)
//   node scripts/restore-db.js --file=... --dry-run      (simula, no escribe)
//
// ⚠️  PELIGRO: este script HACE TRUNCATE de las tablas antes de insertar.
//   Solo úsalo si la DB actual está corrupta/vacía o si quieres re-poblar.
//   Pide confirmación interactiva antes de ejecutar.
// ════════════════════════════════════════════════════════════════

require('dotenv').config();
const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const { Pool } = require('pg');

const args = process.argv.slice(2);
const arg = (name, defecto) => {
  const a = args.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : defecto;
};
const has = (name) => args.includes(`--${name}`);

const FILE = arg('file', null);
const SOLO_TABLA = arg('solo', null);
const DRY_RUN = has('dry-run');
const SKIP_CONFIRM = has('yes') || has('y');

async function confirmar(pregunta) {
  if (SKIP_CONFIRM) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(pregunta + ' (sí/NO): ', a => {
      rl.close();
      resolve(/^s[ií]$/i.test(a.trim()));
    });
  });
}

async function main() {
  if (!FILE) {
    console.error('❌ Falta --file=<path al backup .json.gz>');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no definida. Aborto.');
    process.exit(1);
  }
  if (!fs.existsSync(FILE)) {
    console.error(`❌ No existe: ${FILE}`);
    process.exit(1);
  }

  console.log(`📥 Cargando ${FILE}...`);
  const compressed = fs.readFileSync(FILE);
  const json = zlib.gunzipSync(compressed).toString('utf8');
  const backup = JSON.parse(json);

  console.log(`\n📋 Backup info:`);
  console.log(`   App:         ${backup.app}`);
  console.log(`   Generado:    ${backup.generado_en}`);
  console.log(`   Host origen: ${backup.database_host}`);
  console.log(`   Total rows:  ${backup.total_rows}`);
  console.log(`   Tablas:      ${Object.keys(backup.tablas).length}`);

  if (DRY_RUN) {
    console.log(`\n🧪 DRY RUN: no se escribirá nada.`);
  } else {
    const url = process.env.DATABASE_URL;
    const host = new URL(url).hostname;
    console.log(`\n⚠️  Vas a HACER TRUNCATE + RESTORE en: ${host}`);
    console.log(`   Esto BORRA los datos actuales de cada tabla antes de insertar.`);
    const ok = await confirmar('¿Confirmas?');
    if (!ok) {
      console.log('Cancelado.');
      process.exit(0);
    }
  }

  const needsSsl = /rlwy\.net|amazonaws|herokuapp|render|supabase/.test(process.env.DATABASE_URL);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  });

  const tablasObjetivo = SOLO_TABLA
    ? { [SOLO_TABLA]: backup.tablas[SOLO_TABLA] }
    : backup.tablas;

  if (SOLO_TABLA && !backup.tablas[SOLO_TABLA]) {
    console.error(`❌ Tabla "${SOLO_TABLA}" no existe en el backup.`);
    process.exit(1);
  }

  const client = await pool.connect();
  let totalInsertados = 0;
  try {
    await client.query('BEGIN');
    for (const [t, info] of Object.entries(tablasObjetivo)) {
      if (info.error) {
        console.warn(`✗ ${t}: backup contiene error, saltando.`);
        continue;
      }
      const rows = info.datos || [];
      if (!rows.length) {
        console.log(`○ ${t}: sin datos en backup.`);
        continue;
      }

      if (!DRY_RUN) {
        // TRUNCATE seguro: si las FKs lo bloquean, usa CASCADE
        await client.query(`TRUNCATE "${t}" RESTART IDENTITY CASCADE`);
      }

      const columnas = Object.keys(rows[0]);
      const placeholders = columnas.map((_, i) => `$${i + 1}`).join(',');
      const insertSql = `INSERT INTO "${t}" (${columnas.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`;

      let insertados = 0;
      for (const row of rows) {
        if (DRY_RUN) { insertados++; continue; }
        try {
          await client.query(insertSql, columnas.map(c => row[c]));
          insertados++;
        } catch (e) {
          console.warn(`  ✗ row error en ${t}: ${e.message.slice(0, 80)}`);
        }
      }
      console.log(`✓ ${t}: ${insertados}/${rows.length} ${DRY_RUN ? '(dry run)' : 'insertados'}`);
      totalInsertados += insertados;
    }

    if (DRY_RUN) {
      await client.query('ROLLBACK');
      console.log(`\n🧪 DRY RUN completado. ${totalInsertados} rows hubieran sido insertadas.`);
    } else {
      await client.query('COMMIT');
      console.log(`\n✅ Restore completo. ${totalInsertados} rows insertadas.`);
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('💥 Restore falló (rollback ejecutado):', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
