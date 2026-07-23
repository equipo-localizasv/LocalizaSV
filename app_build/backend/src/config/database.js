const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'localizasv',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  connectionTimeoutMillis: 2000 // Quick timeout to fallback fast if database is offline
};

if (isProduction) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

let useMockDb = false;
const mockFilePath = path.join(__dirname, '../../mock_db.json');

// Initialize mock DB file if it doesn't exist
if (!fs.existsSync(mockFilePath)) {
  fs.writeFileSync(mockFilePath, JSON.stringify({ usuarios: [], casos: [] }, null, 2));
}

const readMockDb = () => {
  try {
    const data = fs.readFileSync(mockFilePath, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.usuarios) parsed.usuarios = [];
    if (!parsed.casos) parsed.casos = [];
    if (!parsed.alertas) parsed.alertas = [];
    return parsed;
  } catch (err) {
    return { usuarios: [], casos: [], alertas: [] };
  }
};

const writeMockDb = (data) => {
  fs.writeFileSync(mockFilePath, JSON.stringify(data, null, 2));
};

// Check database connection and handle fallback
pool.connect((err, client, release) => {
  if (err) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  ADVERTENCIA: No se pudo conectar a PostgreSQL.');
    console.warn('\x1b[33m%s\x1b[0m', '👉 Iniciando base de datos simulada en memoria/JSON para revisión local de la Fase 1.');
    console.warn('\x1b[33m%s\x1b[0m', `👉 Datos persistidos en: ${mockFilePath}`);
    useMockDb = true;
  } else {
    console.log('PostgreSQL database connected successfully.');
    release();
  }
});

// Mock database query handler
const mockQuery = (text, params = []) => {
  const db = readMockDb();
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  // 1. SELECT id FROM usuarios WHERE email = $1 OR dui = $2
  if (normalizedText.includes('SELECT id FROM usuarios WHERE email = $1 OR dui = $2')) {
    const [email, dui] = params;
    const found = db.usuarios.filter(u => u.email === email || u.dui === dui);
    return { rows: found };
  }

  // 2. INSERT INTO usuarios
  if (normalizedText.includes('INSERT INTO usuarios')) {
    const [nombre, dui, email, telefono, password_hash, selfie_url] = params;
    const newUser = {
      id: db.usuarios.length + 1,
      nombre,
      dui,
      email,
      telefono,
      password_hash,
      selfie_url,
      created_at: new Date().toISOString()
    };
    db.usuarios.push(newUser);
    writeMockDb(db);
    return { rows: [newUser] };
  }

  // 3. SELECT * FROM usuarios WHERE email = $1
  if (normalizedText.includes('SELECT * FROM usuarios WHERE email = $1')) {
    const [email] = params;
    const found = db.usuarios.filter(u => u.email === email);
    return { rows: found };
  }

  // 4. SELECT id, nombre, dui... FROM usuarios WHERE id = $1
  if (normalizedText.includes('SELECT id, nombre, dui, email, telefono, selfie_url, created_at FROM usuarios WHERE id = $1')) {
    const [id] = params;
    const found = db.usuarios.filter(u => u.id === parseInt(id));
    return { rows: found };
  }

  // 5. INSERT INTO casos
  if (normalizedText.includes('INSERT INTO casos')) {
    const [
      usuario_id, nombre_desaparecido, edad, genero, fecha_desaparicion,
      ubicacion_desaparicion, descripcion, telefono_contacto, foto_url
    ] = params;
    const newCase = {
      id: db.casos.length + 1,
      usuario_id,
      nombre_desaparecido,
      edad: parseInt(edad),
      genero,
      fecha_desaparicion,
      ubicacion_desaparicion,
      descripcion,
      telefono_contacto,
      foto_url,
      estado: 'Desaparecido',
      created_at: new Date().toISOString()
    };
    db.casos.push(newCase);
    writeMockDb(db);
    return { rows: [newCase] };
  }

  // 6. SELECT c.*, u.nombre as creador_nombre FROM casos
  if (normalizedText.includes('SELECT c.*, u.nombre as creador_nombre FROM casos c JOIN usuarios u ON c.usuario_id = u.id')) {
    let list = db.casos.map(c => {
      const user = db.usuarios.find(u => u.id === c.usuario_id);
      return { ...c, creador_nombre: user ? user.nombre : 'Usuario Anónimo' };
    });

    // Handle filters
    // We check if params contains search and/or status.
    // In our caseController, query can have up to 2 params.
    let filterSearch = null;
    let filterStatus = null;

    if (params.length > 0) {
      // Check order of params based on controller queries
      if (normalizedText.includes('c.nombre_desaparecido ILIKE $1') && normalizedText.includes('c.estado = $2')) {
        filterSearch = params[0].replace(/%/g, '').toLowerCase();
        filterStatus = params[1];
      } else if (normalizedText.includes('c.nombre_desaparecido ILIKE $1')) {
        filterSearch = params[0].replace(/%/g, '').toLowerCase();
      } else if (normalizedText.includes('c.estado = $1')) {
        filterStatus = params[0];
      }
    }

    if (filterSearch) {
      list = list.filter(c => c.nombre_desaparecido.toLowerCase().includes(filterSearch));
    }
    if (filterStatus) {
      list = list.filter(c => c.estado === filterStatus);
    }

    // Sort by created_at DESC
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return { rows: list };
  }

  // 7. SELECT c.*, ... FROM casos c JOIN usuarios u WHERE c.id = $1
  if (normalizedText.includes('WHERE c.id = $1') && normalizedText.includes('u.selfie_url as creador_selfie_url')) {
    const [id] = params;
    const caso = db.casos.find(c => c.id === parseInt(id));
    if (!caso) return { rows: [] };

    const user = db.usuarios.find(u => u.id === caso.usuario_id);
    return {
      rows: [{
        ...caso,
        creador_nombre: user ? user.nombre : 'Usuario Anónimo',
        creador_email: user ? user.email : '',
        creador_telefono: user ? user.telefono : '',
        creador_selfie_url: user ? user.selfie_url : ''
      }]
    };
  }

  // 8. SELECT usuario_id FROM casos WHERE id = $1
  if (normalizedText.includes('SELECT usuario_id FROM casos WHERE id = $1')) {
    const [id] = params;
    const caso = db.casos.find(c => c.id === parseInt(id));
    return { rows: caso ? [caso] : [] };
  }

  // 9. UPDATE casos SET estado = $1 WHERE id = $2 RETURNING *
  if (normalizedText.includes('UPDATE casos SET estado = $1 WHERE id = $2')) {
    const [estado, id] = params;
    const idx = db.casos.findIndex(c => c.id === parseInt(id));
    if (idx !== -1) {
      db.casos[idx].estado = estado;
      writeMockDb(db);
      return { rows: [db.casos[idx]] };
    }
    return { rows: [] };
  }

  // 10. SELECT id FROM casos WHERE id = $1
  if (normalizedText.includes('SELECT id FROM casos WHERE id = $1')) {
    const [id] = params;
    const found = db.casos.filter(c => c.id === parseInt(id));
    return { rows: found };
  }

  // Query state ID from name (mock estados_alerta)
  if (normalizedText.includes('SELECT id FROM estados_alerta WHERE nombre =')) {
    const name = params[0] || 'Pendiente';
    let id = 1;
    if (name.toLowerCase() === 'pendiente') id = 1;
    else if (name.toLowerCase() === 'confirmado') id = 2;
    else if (name.toLowerCase() === 'falso positivo' || name.toLowerCase() === 'falso_positivo') id = 3;
    return { rows: [{ id }] };
  }

  // 11. INSERT INTO alertas
  if (normalizedText.includes('INSERT INTO alertas')) {
    const [caso_id, ubicacion_lat, ubicacion_lng, porcentaje_confianza, video_url, foto_evidencia_url, id_estado_or_estado] = params;
    
    const isNewSchema = normalizedText.includes('id_estado_alerta');
    const newAlert = {
      id: db.alertas.length + 1,
      caso_id: parseInt(caso_id),
      ubicacion_lat: parseFloat(ubicacion_lat),
      ubicacion_lng: parseFloat(ubicacion_lng),
      porcentaje_confianza: parseFloat(porcentaje_confianza),
      video_url: video_url || null,
      foto_evidencia_url: foto_evidencia_url || null,
      fecha_deteccion: new Date().toISOString()
    };
    
    if (isNewSchema) {
      newAlert.id_estado_alerta = parseInt(id_estado_or_estado);
      newAlert.estado = id_estado_or_estado === 1 ? 'pendiente' : (id_estado_or_estado === 2 ? 'confirmado' : 'falso positivo');
    } else {
      newAlert.estado = id_estado_or_estado;
      newAlert.id_estado_alerta = id_estado_or_estado === 'pendiente' ? 1 : (id_estado_or_estado === 'confirmado' ? 2 : 3);
    }
    
    db.alertas.push(newAlert);
    writeMockDb(db);
    return { rows: [newAlert] };
  }

  // 12. SELECT a.*, c.nombre_desaparecido FROM alertas JOIN casos
  if (normalizedText.includes("FROM alertas a JOIN casos c ON a.caso_id = c.id WHERE a.estado = 'pendiente'") || 
      (normalizedText.includes('FROM alertas a') && normalizedText.includes('JOIN estados_alerta ea'))) {
    const list = db.alertas
      .filter(a => {
        if (a.id_estado_alerta !== undefined) {
          return a.id_estado_alerta === 1;
        }
        return a.estado === 'pendiente';
      })
      .map(a => {
        const caso = db.casos.find(c => c.id === a.caso_id);
        return {
          ...a,
          estado: 'pendiente',
          nombre_desaparecido: caso ? caso.nombre_desaparecido : 'Caso Desconocido'
        };
      });
    list.sort((a, b) => new Date(b.fecha_deteccion || b.created_at) - new Date(a.fecha_deteccion || a.created_at));
    return { rows: list };
  }

  // 13. UPDATE alertas SET id_estado_alerta = $1 ... OR SET estado = $1
  if (normalizedText.includes('UPDATE alertas SET id_estado_alerta = $1') || 
      normalizedText.includes('UPDATE alertas SET estado = $1')) {
    
    const isNewSchema = normalizedText.includes('id_estado_alerta = $1');
    const idx = db.alertas.findIndex(a => a.id === parseInt(params[params.length - 1]));
    
    if (idx !== -1) {
      if (isNewSchema) {
        const [id_estado_alerta, moderador_id, fecha_validacion, comentarios_moderador] = params;
        db.alertas[idx].id_estado_alerta = parseInt(id_estado_alerta);
        db.alertas[idx].moderador_id = moderador_id ? parseInt(moderador_id) : null;
        db.alertas[idx].fecha_validacion = fecha_validacion;
        db.alertas[idx].comentarios_moderador = comentarios_moderador;
        db.alertas[idx].estado = id_estado_alerta === 1 ? 'pendiente' : (id_estado_alerta === 2 ? 'confirmado' : 'falso positivo');
      } else {
        const [estado] = params;
        db.alertas[idx].estado = estado;
        db.alertas[idx].id_estado_alerta = estado === 'pendiente' ? 1 : (estado === 'confirmado' ? 2 : 3);
      }
      writeMockDb(db);
      return { rows: [db.alertas[idx]] };
    }
    return { rows: [] };
  }

  console.warn('Unhandled mock query:', normalizedText, params);
  return { rows: [] };
};

module.exports = {
  query: (text, params) => {
    if (useMockDb) {
      return mockQuery(text, params);
    }
    return pool.query(text, params);
  },
  pool
};
