const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'localizasv',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  connectionTimeoutMillis: 5000
});

const mockFilePath = path.join(__dirname, '../mock_db.json');

async function migrate() {
  console.log('🚀 Iniciando migración automática de mock_db.json a PostgreSQL...');

  if (!fs.existsSync(mockFilePath)) {
    console.error('❌ Error: No se encontró el archivo mock_db.json');
    process.exit(1);
  }

  const mockData = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 0. Limpiar tablas existentes para evitar conflictos de llaves únicas o duplicados
    console.log('🧹 Limpiando tablas previas...');
    await client.query(`
      TRUNCATE tokens_fcm, alertas, casos, camaras, usuarios RESTART IDENTITY CASCADE;
    `);

    // 1. Migrar Usuarios
    let userCount = 0;
    if (mockData.usuarios && Array.isArray(mockData.usuarios)) {
      for (const u of mockData.usuarios) {
        await client.query(
          `INSERT INTO usuarios (id, nombre, dui, email, telefono, password_hash, selfie_url, rol, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            u.id,
            u.nombre,
            u.dui,
            u.email,
            u.telefono,
            u.password_hash,
            u.selfie_url,
            u.rol || 'ciudadano',
            u.created_at || new Date()
          ]
        );
        userCount++;
      }
      await client.query(`SELECT setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE((SELECT MAX(id) FROM usuarios), 1))`);
    }
    console.log(`✅ Usuarios migrados: ${userCount}`);

    // 2. Migrar Casos
    let caseCount = 0;
    if (mockData.casos && Array.isArray(mockData.casos)) {
      for (const c of mockData.casos) {
        // Verificar que el usuario_id exista
        const userCheck = await client.query('SELECT id FROM usuarios WHERE id = $1', [c.usuario_id]);
        const validUserId = userCheck.rows.length > 0 ? c.usuario_id : 1;

        await client.query(
          `INSERT INTO casos (id, usuario_id, nombre_desaparecido, edad, genero, fecha_desaparicion, ubicacion_desaparicion, descripcion, telefono_contacto, estado, foto_url, usuario_asignado_id, fecha_aceptacion, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            c.id,
            validUserId,
            c.nombre_desaparecido,
            c.edad,
            c.genero,
            c.fecha_desaparicion,
            c.ubicacion_desaparicion,
            c.descripcion,
            c.telefono_contacto,
            c.estado || 'Desaparecido',
            c.foto_url,
            c.usuario_asignado_id || null,
            c.fecha_aceptacion || null,
            c.created_at || new Date()
          ]
        );
        caseCount++;
      }
      await client.query(`SELECT setval(pg_get_serial_sequence('casos', 'id'), COALESCE((SELECT MAX(id) FROM casos), 1))`);
    }
    console.log(`✅ Casos migrados: ${caseCount}`);

    // 3. Migrar Cámaras
    let cameraCount = 0;
    if (mockData.camaras && Array.isArray(mockData.camaras)) {
      for (const cam of mockData.camaras) {
        await client.query(
          `INSERT INTO camaras (id, nombre, ubicacion, lat, lng, ip_address, base_url, stream_url, snapshot_url, tipo, resolucion, fps, linterna, zoom, estado, ultima_actividad)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            cam.id,
            cam.nombre,
            cam.ubicacion || 'San Salvador, El Salvador',
            cam.lat || 13.6929,
            cam.lng || -89.2182,
            cam.ip_address || null,
            cam.base_url || null,
            cam.stream_url || null,
            cam.snapshot_url || null,
            cam.tipo || 'Cámara Móvil IP Webcam',
            cam.resolucion || '1080p FHD',
            cam.fps || 30,
            cam.linterna || false,
            cam.zoom || 0,
            cam.estado || 'activa',
            cam.ultima_actividad || new Date()
          ]
        );
        cameraCount++;
      }
      await client.query(`SELECT setval(pg_get_serial_sequence('camaras', 'id'), COALESCE((SELECT MAX(id) FROM camaras), 1))`);
    }
    console.log(`✅ Cámaras migradas: ${cameraCount}`);

    // 4. Migrar Alertas
    let alertCount = 0;
    if (mockData.alertas && Array.isArray(mockData.alertas)) {
      for (const a of mockData.alertas) {
        // Verificar que el caso_id exista
        const caseCheck = await client.query('SELECT id FROM casos WHERE id = $1', [a.caso_id]);
        if (caseCheck.rows.length === 0) continue;

        await client.query(
          `INSERT INTO alertas (id, caso_id, ubicacion_lat, ubicacion_lng, porcentaje_confianza, video_url, foto_evidencia_url, estado, id_estado_alerta, tipo_origen, ubicacion_nombre, moderador_id, fecha_validacion, comentarios, fecha_deteccion, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            a.id,
            a.caso_id,
            a.ubicacion_lat,
            a.ubicacion_lng,
            a.porcentaje_confianza,
            a.video_url || null,
            a.foto_evidencia_url || null,
            a.estado || 'pendiente',
            a.id_estado_alerta || 1,
            a.tipo_origen || 'Sistema Autónomo',
            a.ubicacion_nombre || null,
            a.moderador_id || null,
            a.fecha_validacion || null,
            a.comentarios || null,
            a.fecha_deteccion || a.created_at || new Date(),
            a.created_at || new Date()
          ]
        );
        alertCount++;
      }
      await client.query(`SELECT setval(pg_get_serial_sequence('alertas', 'id'), COALESCE((SELECT MAX(id) FROM alertas), 1))`);
    }
    console.log(`✅ Alertas migradas: ${alertCount}`);

    // 5. Migrar Tokens FCM
    let tokenCount = 0;
    if (mockData.tokens_fcm && Array.isArray(mockData.tokens_fcm)) {
      for (const t of mockData.tokens_fcm) {
        const userCheck = await client.query('SELECT id FROM usuarios WHERE id = $1', [t.usuario_id]);
        if (userCheck.rows.length === 0) continue;

        await client.query(
          `INSERT INTO tokens_fcm (id, usuario_id, token, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (token) DO NOTHING`,
          [
            t.id,
            t.usuario_id,
            t.token,
            t.created_at || new Date()
          ]
        );
        tokenCount++;
      }
      await client.query(`SELECT setval(pg_get_serial_sequence('tokens_fcm', 'id'), COALESCE((SELECT MAX(id) FROM tokens_fcm), 1))`);
    }
    console.log(`✅ Tokens FCM migrados: ${tokenCount}`);

    await client.query('COMMIT');
    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO A POSTGRESQL!');
    console.log('Ahora todos los datos históricos y registros están en tus tablas locales.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
