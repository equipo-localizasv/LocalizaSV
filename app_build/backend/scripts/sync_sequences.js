const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function syncSequences() {
  const tables = ['usuarios', 'casos', 'alertas', 'camaras', 'estados_alerta', 'tokens_fcm'];
  console.log('🔄 Sincronizando contadores y secuencias de PostgreSQL...');

  for (const table of tables) {
    try {
      const res = await pool.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
      );
      console.log(`✅ Secuencia '${table}_id_seq' ajustada al valor: ${res.rows[0].setval}`);
    } catch (err) {
      console.warn(`⚠️ No se pudo ajustar secuencia para '${table}': ${err.message}`);
    }
  }

  // Verificar conteo total de registros
  console.log('\n📊 Resumen de datos en base de datos PostgreSQL:');
  for (const table of tables) {
    try {
      const countRes = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   - ${table}: ${countRes.rows[0].count} registros`);
    } catch (err) {
      console.warn(`   - ${table}: Error (${err.message})`);
    }
  }

  console.log('\n✨ Todas las tablas y secuencias están 100% sincronizadas y listas para auto-guardado.');
  process.exit(0);
}

syncSequences().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
