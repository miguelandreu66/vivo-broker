const { Pool } = require('pg');

// Detecta si la DB es local (sin SSL) o remota tipo Railway/Heroku (con SSL self-signed)
const url = process.env.DATABASE_URL || '';
const necesitaSSL = /railway|rlwy\.net|render|heroku|amazonaws|supabase|neon|fly\.dev/.test(url) ||
                    /sslmode=require|sslmode=verify|sslmode=prefer/.test(url) ||
                    process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: url,
  ssl: necesitaSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[db] error en pool:', err.message);
});

module.exports = pool;
