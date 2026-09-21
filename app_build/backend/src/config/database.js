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
  connectionTimeoutMillis: 5000
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
    if (!parsed.camaras) parsed.camaras = [];
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
    console.warn('\x1b[31m%s\x1b[0m', `👉 Detalle del error: ${err.message}`);
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
    const [nombre, dui, email, telefono, password_hash, selfie_url, rol] = params;
    const nextId = db.usuarios.length > 0 ? Math.max(...db.usuarios.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: nextId,
      nombre,
      dui,
      email,
      telefono,
      password_hash,
      selfie_url,
      rol: rol || 'ciudadano',
      created_at: new Date().toISOString()
    };
    db.usuarios.push(newUser);
    writeMockDb(db);
    return { rows: [newUser] };
  }

  // 3. SELECT * FROM usuarios WHERE email = $1
  if (normalizedText.includes('SELECT * FROM usuarios WHERE email = $1')) {
    const [email] = params;
    const found = db.usuarios.filter(u => u.email === email).map(u => ({
      ...u,
      rol: u.rol || 'ciudadano'
    }));
    return { rows: found };
  }

  // 4. SELECT id, nombre, dui... FROM usuarios WHERE id = $1
  if (normalizedText.includes('FROM usuarios WHERE id = $1')) {
    const [id] = params;
    const found = db.usuarios.filter(u => u.id === parseInt(id)).map(u => ({
      ...u,
      rol: u.rol || 'ciudadano'
    }));
    return { rows: found };
  }

  // 5. INSERT INTO casos
  if (normalizedText.includes('INSERT INTO casos')) {
    const [
      usuario_id, nombre_desaparecido, edad, genero, fecha_desaparicion,
      ubicacion_desaparicion, descripcion, telefono_contacto, foto_url,
      biometria_insightface
    ] = params;
    const nextId = db.casos.length > 0 ? Math.max(...db.casos.map(c => c.id)) + 1 : 1;
    const newCase = {
      id: nextId,
      usuario_id: parseInt(usuario_id),
      nombre_desaparecido,
      edad: parseInt(edad),
      genero,
      fecha_desaparicion,
      ubicacion_desaparicion,
      descripcion,
      telefono_contacto,
      foto_url,
      biometria_insightface: biometria_insightface || null,
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
      const rescuer = c.usuario_asignado_id ? db.usuarios.find(u => u.id === c.usuario_asignado_id) : null;
      return { 
        ...c, 
        creador_nombre: user ? user.nombre : 'Usuario Anónimo',
        rescatista_nombre: rescuer ? rescuer.nombre : null,
        rescatista_id: c.usuario_asignado_id || null
      };
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
    const rescuer = caso.usuario_asignado_id ? db.usuarios.find(u => u.id === caso.usuario_asignado_id) : null;
    return {
      rows: [{
        ...caso,
        creador_nombre: user ? user.nombre : 'Usuario Anónimo',
        creador_email: user ? user.email : '',
        creador_telefono: user ? user.telefono : '',
        creador_selfie_url: user ? user.selfie_url : '',
        rescatista_nombre: rescuer ? rescuer.nombre : null,
        rescatista_id: caso.usuario_asignado_id || null
      }]
    };
  }

  // 8. SELECT usuario_id FROM casos WHERE id = $1
  if (normalizedText.includes('SELECT usuario_id FROM casos WHERE id = $1')) {
    const [id] = params;
    const caso = db.casos.find(c => c.id === parseInt(id));
    return { rows: caso ? [caso] : [] };
  }

  // 9.1 UPDATE casos SET estado = $1, usuario_asignado_id = $2, fecha_aceptacion = $3 WHERE id = $4
  if (normalizedText.includes('UPDATE casos SET') && normalizedText.includes('usuario_asignado_id')) {
    const [estado, usuario_asignado_id, fecha_aceptacion, id] = params;
    const idx = db.casos.findIndex(c => c.id === parseInt(id));
    if (idx !== -1) {
      db.casos[idx].estado = estado;
      db.casos[idx].usuario_asignado_id = parseInt(usuario_asignado_id);
      db.casos[idx].fecha_aceptacion = fecha_aceptacion;
      writeMockDb(db);
      const rescuer = db.usuarios.find(u => u.id === parseInt(usuario_asignado_id));
      return { 
        rows: [{
          ...db.casos[idx],
          rescatista_nombre: rescuer ? rescuer.nombre : null
        }] 
      };
    }
    return { rows: [] };
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

  // 10. SELECT id FROM casos WHERE id = $1 (broadened)
  if (normalizedText.includes('FROM casos WHERE id = $1')) {
    const [id] = params;
    const found = db.casos.filter(c => c.id === parseInt(id));
    return { rows: found };
  }

  // 10.1 SELECT * FROM casos (General)
  if (normalizedText.startsWith('SELECT') && normalizedText.includes('FROM casos') && !normalizedText.includes('JOIN')) {
    return { rows: db.casos || [] };
  }

  // 10.5 SELECT id, caso_id FROM alertas WHERE id = $1
  if (normalizedText.includes('FROM alertas WHERE id = $1')) {
    const [id] = params;
    const found = db.alertas.filter(a => a.id === parseInt(id));
    return { rows: found };
  }

  // 10.6 SELECT id FROM estados_alerta WHERE nombre = $1 or literal (broadened)
  if (!normalizedText.includes('FROM alertas') && normalizedText.includes('estados_alerta')) {
    let name = 'Pendiente';
    if (params.length > 0) name = params[0];
    else if (normalizedText.includes("'pendiente'") || normalizedText.includes("'Pendiente'")) name = 'Pendiente';
    else if (normalizedText.includes("'confirmado'") || normalizedText.includes("'Confirmado'")) name = 'Confirmado';
    else if (normalizedText.includes("'falso positivo'") || normalizedText.includes("'Falso Positivo'")) name = 'Falso Positivo';
    
    const norm = name.toLowerCase();
    const id = norm === 'pendiente' ? 1 : (norm === 'confirmado' ? 2 : 3);
    return { rows: [{ id }] };
  }

  // 11. INSERT INTO alertas
  if (normalizedText.includes('INSERT INTO alertas')) {
    let newAlert;
    const nextId = db.alertas.length > 0 ? Math.max(...db.alertas.map(a => a.id)) + 1 : 1;

    if (params.length >= 9) {
      // Sighting format: [caso_id, lat, lng, confianza, foto, id_estado, tipo_origen, ubicacion_nombre, comentarios]
      const [caso_id, ubicacion_lat, ubicacion_lng, porcentaje_confianza, foto_evidencia_url, id_estado_alerta, tipo_origen, ubicacion_nombre, comentarios] = params;
      newAlert = {
        id: nextId,
        caso_id: parseInt(caso_id),
        ubicacion_lat: parseFloat(ubicacion_lat),
        ubicacion_lng: parseFloat(ubicacion_lng),
        porcentaje_confianza: parseFloat(porcentaje_confianza),
        foto_evidencia_url,
        id_estado_alerta: parseInt(id_estado_alerta),
        estado: 'pendiente',
        tipo_origen: tipo_origen || 'Avistamiento Ciudadano',
        ubicacion_nombre: ubicacion_nombre || 'Zona urbana',
        comentarios: comentarios || 'Avistamiento reportado por la comunidad.',
        created_at: new Date().toISOString()
      };
    } else {
      const [caso_id, ubicacion_lat, ubicacion_lng, porcentaje_confianza, video_url, foto_evidencia_url, id_estado_or_estado] = params;
      const isNewSchema = normalizedText.includes('id_estado_alerta');
      newAlert = {
        id: nextId,
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
    }
    
    db.alertas.push(newAlert);
    writeMockDb(db);
    return { rows: [newAlert] };
  }

  // 12. SELECT FROM camaras
  if (normalizedText.startsWith('SELECT') && normalizedText.includes('FROM camaras WHERE id = $1')) {
    const [id] = params;
    const cam = (db.camaras || []).find(c => c.id === parseInt(id));
    return { rows: cam ? [cam] : [] };
  }

  if (normalizedText.startsWith('SELECT') && normalizedText.includes('FROM camaras')) {
    return { rows: db.camaras || [] };
  }

  // 12.1 INSERT INTO camaras (Con prevención estricta de duplicados)
  if (normalizedText.includes('INSERT INTO camaras')) {
    const [nombre, ubicacion, lat, lng, stream_url, tipo, resolucion, fps, estado, ip_address, snapshot_url, base_url] = params;
    if (!db.camaras) db.camaras = [];
    const cleanIp = (ip_address || (stream_url ? stream_url.replace(/http:\/\//, '').replace(/\/video.*/, '') : '')).trim();
    const cleanBase = (base_url || (cleanIp ? (cleanIp.startsWith('http') ? cleanIp : `http://${cleanIp}`) : '')).trim();

    // Comprobar si ya existe una cámara registrada con esa misma IP, Base URL o Stream
    const existingIdx = db.camaras.findIndex(c => 
      (cleanIp && c.ip_address === cleanIp) ||
      (cleanBase && c.base_url === cleanBase) ||
      (stream_url && c.stream_url === stream_url) ||
      (c.nombre && c.nombre.trim().toLowerCase() === (nombre || '').trim().toLowerCase())
    );

    if (existingIdx !== -1) {
      // Actualizar cámara existente para no duplicar registros
      db.camaras[existingIdx] = {
        ...db.camaras[existingIdx],
        nombre: nombre || db.camaras[existingIdx].nombre,
        ubicacion: ubicacion || db.camaras[existingIdx].ubicacion,
        lat: lat ? parseFloat(lat) : db.camaras[existingIdx].lat,
        lng: lng ? parseFloat(lng) : db.camaras[existingIdx].lng,
        ip_address: cleanIp || db.camaras[existingIdx].ip_address,
        base_url: cleanBase || db.camaras[existingIdx].base_url,
        stream_url: stream_url || db.camaras[existingIdx].stream_url,
        snapshot_url: snapshot_url || db.camaras[existingIdx].snapshot_url,
        tipo: tipo || db.camaras[existingIdx].tipo,
        resolucion: resolucion || db.camaras[existingIdx].resolucion,
        fps: fps ? parseInt(fps) : db.camaras[existingIdx].fps,
        estado: 'activa',
        ultima_actividad: new Date().toISOString()
      };
      writeMockDb(db);
      return { rows: [db.camaras[existingIdx]] };
    }

    const nextId = db.camaras.length > 0 ? Math.max(...db.camaras.map(c => c.id)) + 1 : 1;
    const newCam = {
      id: nextId,
      nombre,
      ubicacion,
      lat: parseFloat(lat) || 13.6929,
      lng: parseFloat(lng) || -89.2182,
      ip_address: cleanIp,
      base_url: cleanBase,
      stream_url: stream_url || `${cleanBase}/video`,
      snapshot_url: snapshot_url || `${cleanBase}/shot.jpg`,
      tipo: tipo || 'IP Webcam Móvil',
      resolucion: resolucion || '1080p FHD',
      fps: parseInt(fps) || 30,
      linterna: false,
      zoom: 0,
      estado: estado || 'activa',
      ultima_actividad: new Date().toISOString()
    };
    db.camaras.push(newCam);
    writeMockDb(db);
    return { rows: [newCam] };
  }

  // 12.15 UPDATE camaras
  if (normalizedText.includes('UPDATE camaras SET')) {
    if (normalizedText.includes('pan =') || normalizedText.includes('tilt =') || normalizedText.includes('linterna =') || normalizedText.includes('zoom =') || normalizedText.includes('patrullaje')) {
      const id = params[params.length - 1];
      const idx = (db.camaras || []).findIndex(c => c.id === parseInt(id));
      if (idx !== -1) {
        if (normalizedText.includes('pan = $1, tilt = $2')) {
          db.camaras[idx].pan = parseInt(params[0]) || 0;
          db.camaras[idx].tilt = parseInt(params[1]) || 0;
        } else if (normalizedText.includes('pan =')) {
          db.camaras[idx].pan = parseInt(params[0]) || 0;
        } else if (normalizedText.includes('tilt =')) {
          db.camaras[idx].tilt = parseInt(params[0]) || 0;
        }
        if (normalizedText.includes('linterna =')) {
          db.camaras[idx].linterna = Boolean(params[0]);
        }
        if (normalizedText.includes('zoom =')) {
          db.camaras[idx].zoom = parseInt(params[0]) || 0;
        }
        if (normalizedText.includes('patrullaje')) {
          db.camaras[idx].patrullaje_activo = Boolean(params[0]);
        }
        db.camaras[idx].ultima_actividad = new Date().toISOString();
        writeMockDb(db);
        return { rows: [db.camaras[idx]] };
      }
    } else {
      // General update
      const id = params[params.length - 1];
      const idx = (db.camaras || []).findIndex(c => c.id === parseInt(id));
      if (idx !== -1) {
        if (params.length >= 6) {
          db.camaras[idx].nombre = params[0];
          db.camaras[idx].ubicacion = params[1];
          db.camaras[idx].lat = parseFloat(params[2]) || db.camaras[idx].lat;
          db.camaras[idx].lng = parseFloat(params[3]) || db.camaras[idx].lng;
          db.camaras[idx].stream_url = params[4];
          db.camaras[idx].snapshot_url = params[5];
          if (params[6]) db.camaras[idx].base_url = params[6];
          if (params[7]) db.camaras[idx].ip_address = params[7];
        }
        db.camaras[idx].estado = 'activa';
        db.camaras[idx].ultima_actividad = new Date().toISOString();
        writeMockDb(db);
        return { rows: [db.camaras[idx]] };
      }
    }
    return { rows: [] };
  }

  // 12.2 DELETE FROM camaras
  if (normalizedText.includes('DELETE FROM camaras')) {
    const [id] = params;
    if (db.camaras) {
      db.camaras = db.camaras.filter(c => parseInt(c.id) !== parseInt(id));
      writeMockDb(db);
    }
    return { rows: [] };
  }

  // 12. SELECT a.*, c.nombre_desaparecido FROM alertas JOIN casos
  if (normalizedText.includes("WHERE LOWER(ea.nombre) != 'falso positivo'")) {
    const list = db.alertas
      .filter(a => {
        if (a.id_estado_alerta !== undefined) {
          return a.id_estado_alerta !== 3; // 3 is Falso Positivo
        }
        return a.estado !== 'falso positivo' && a.estado !== 'falso_positivo';
      })
      .map(a => {
        const caso = db.casos.find(c => c.id === a.caso_id);
        return {
          ...a,
          estado: a.estado || (a.id_estado_alerta === 1 ? 'pendiente' : 'confirmado'),
          nombre_desaparecido: caso ? caso.nombre_desaparecido : 'Caso Desconocido'
        };
      });
    list.sort((a, b) => new Date(b.fecha_deteccion || b.created_at) - new Date(a.fecha_deteccion || a.created_at));
    return { rows: list };
  }

  if (normalizedText.includes("FROM alertas a JOIN casos c ON a.caso_id = c.id WHERE a.estado = 'pendiente'") || 
      (normalizedText.includes('FROM alertas a') && normalizedText.includes('a.id_estado_alerta = 1')) ||
      (normalizedText.includes('FROM alertas a') && normalizedText.includes('JOIN estados_alerta ea') && normalizedText.includes("'pendiente'"))) {
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

  // 12b. SELECT a.*, c.nombre_desaparecido FROM alertas JOIN casos WHERE a.estado = 'confirmado' or a.id_estado_alerta = 2
  if (normalizedText.includes("WHERE a.estado = 'confirmado'") || 
      (normalizedText.includes('FROM alertas a') && normalizedText.includes('a.id_estado_alerta = 2'))) {
    const list = db.alertas
      .filter(a => {
        if (a.id_estado_alerta !== undefined) {
          return a.id_estado_alerta === 2;
        }
        return a.estado === 'confirmado';
      })
      .map(a => {
        const caso = db.casos.find(c => c.id === a.caso_id);
        return {
          ...a,
          estado: 'confirmado',
          nombre_desaparecido: caso ? caso.nombre_desaparecido : 'Caso Desconocido'
        };
      });
    list.sort((a, b) => new Date(b.fecha_deteccion || b.created_at) - new Date(a.fecha_deteccion || a.created_at));
    return { rows: list };
  }

  // 13. SELECT id FROM alertas WHERE id = $1
  if (normalizedText.includes('SELECT id FROM alertas WHERE id = $1')) {
    const [id] = params;
    const found = db.alertas.filter(a => a.id === parseInt(id));
    return { rows: found };
  }

  // 14. UPDATE alertas SET estado = $1 WHERE id = $2 RETURNING * (or full schema)
  if (normalizedText.includes('UPDATE alertas SET id_estado_alerta = $1') || normalizedText.includes('UPDATE alertas SET estado = $1 WHERE id = $2')) {
    if (params.length >= 6) {
      const [id_estado_alerta, estado, moderador_id, fecha_validacion, comentarios, id] = params;
      const idx = db.alertas.findIndex(a => a.id === parseInt(id));
      if (idx !== -1) {
        db.alertas[idx].id_estado_alerta = parseInt(id_estado_alerta);
        db.alertas[idx].estado = estado;
        db.alertas[idx].moderador_id = moderador_id;
        db.alertas[idx].fecha_validacion = fecha_validacion;
        db.alertas[idx].comentarios = comentarios;
        writeMockDb(db);
        return { rows: [db.alertas[idx]] };
      }
    } else {
      const [estado, id] = params;
      const idx = db.alertas.findIndex(a => a.id === parseInt(id));
      if (idx !== -1) {
        db.alertas[idx].estado = estado;
        writeMockDb(db);
        return { rows: [db.alertas[idx]] };
      }
    }
    return { rows: [] };
  }

  // 14. SELECT nombre_desaparecido FROM casos WHERE id = $1
  if (normalizedText.includes('SELECT nombre_desaparecido FROM casos WHERE id = $1')) {
    const [id] = params;
    const caso = db.casos.find(c => c.id === parseInt(id));
    return { rows: caso ? [{ nombre_desaparecido: caso.nombre_desaparecido }] : [] };
  }

  // 15. INSERT INTO tokens_fcm
  if (normalizedText.includes('INSERT INTO tokens_fcm')) {
    const [usuario_id, token] = params;
    if (!db.tokens_fcm) db.tokens_fcm = [];
    const existingIdx = db.tokens_fcm.findIndex(t => t.token === token);
    const newT = {
      id: existingIdx !== -1 ? db.tokens_fcm[existingIdx].id : db.tokens_fcm.length + 1,
      usuario_id: usuario_id ? parseInt(usuario_id) : null,
      token,
      created_at: new Date().toISOString()
    };
    if (existingIdx !== -1) {
      db.tokens_fcm[existingIdx] = newT;
    } else {
      db.tokens_fcm.push(newT);
    }
    writeMockDb(db);
    return { rows: [newT] };
  }

  // 16. SELECT token FROM tokens_fcm
  if (normalizedText.includes('SELECT token FROM tokens_fcm')) {
    if (!db.tokens_fcm) db.tokens_fcm = [];
    return { rows: db.tokens_fcm.map(t => ({ token: t.token })) };
  }

  // 17. Optimized: WHERE a.id_estado_alerta = 1
  if (normalizedText.includes('WHERE a.id_estado_alerta = 1')) {
    const list = db.alertas
      .filter(a => (a.id_estado_alerta === 1 || a.estado === 'pendiente'))
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

  // 18. Optimized: WHERE a.id_estado_alerta != 3
  if (normalizedText.includes('WHERE a.id_estado_alerta != 3')) {
    const list = db.alertas
      .filter(a => (a.id_estado_alerta !== 3 && a.estado !== 'falso positivo'))
      .map(a => {
        const caso = db.casos.find(c => c.id === a.caso_id);
        return {
          ...a,
          estado: a.estado || 'confirmado',
          nombre_desaparecido: caso ? caso.nombre_desaparecido : 'Caso Desconocido'
        };
      });
    list.sort((a, b) => new Date(b.fecha_deteccion || b.created_at) - new Date(a.fecha_deteccion || a.created_at));
    return { rows: list };
  }

  // 19. UPDATE alertas SET id_estado_alerta = $1, estado = $2, ... WHERE id = $6 RETURNING *
  if (normalizedText.includes('UPDATE alertas SET id_estado_alerta = $1, estado = $2, moderador_id = $3, fecha_validacion = $4, comentarios = $5 WHERE id = $6')) {
    const [id_estado_alerta, estado, moderador_id, fecha_validacion, comentarios, id] = params;
    const idx = db.alertas.findIndex(a => a.id === parseInt(id));
    if (idx !== -1) {
      db.alertas[idx].id_estado_alerta = parseInt(id_estado_alerta);
      db.alertas[idx].estado = estado;
      db.alertas[idx].moderador_id = moderador_id ? parseInt(moderador_id) : null;
      db.alertas[idx].fecha_validacion = fecha_validacion;
      db.alertas[idx].comentarios = comentarios;
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
