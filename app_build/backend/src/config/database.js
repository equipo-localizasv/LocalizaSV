const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR CRÍTICO: La variable DATABASE_URL no está definida en las variables de entorno.');
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000 // Evita que se quede colgado indefinidamente
});

// Probar conexión al arrancar
pool.connect((err, client, release) => {
  if (err) {
    console.error('⚠️ ADVERTENCIA: No se pudo conectar a PostgreSQL.');
    console.error('👉 Detalle exacto del error:', err.stack || err);
  } else {
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL en Neon.');
    release();
  }
});

module.exports = pool;
