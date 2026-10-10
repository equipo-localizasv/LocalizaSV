const db = require('../config/database');
const insightFaceService = require('../services/insightFaceService');
const jwt = require('jsonwebtoken');

// Helper to inspect user token even on optional/public routes
const getOptionalUser = (req) => {
  if (req.user) return req.user;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    if (token) {
      try {
        return jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey_localizasv_2026');
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

// Helper: Enmascarar datos del reportante y teléfono para evitar estafas/extorsiones
const sanitizeCaseForViewer = (c, viewer) => {
  const isPrivileged = viewer && (
    viewer.rol === 'administrador' ||
    viewer.rol === 'moderador' ||
    viewer.rol === 'autoridad' ||
    viewer.id === c.usuario_id
  );

  if (isPrivileged) {
    return {
      ...c,
      privatizado: false
    };
  }

  // Vista ciudadana / pública general: Privatización estricta solicitada
  return {
    ...c,
    creador_nombre: 'Reportante Resguardado (Anonimato C4I)',
    creador_email: 'seguridad.denuncias@pnc.gob.sv',
    creador_telefono: 'Canal Oficial 911 / 122 PNC',
    creador_selfie_url: null,
    telefono_contacto: 'Canal Oficial de Emergencias 911 / 122 PNC (Protegido)',
    direccion_vivienda: c.direccion_vivienda ? 'Protegida (Solo visible para patrulla PNC en custodia)' : null,
    privatizado: true
  };
};

const createCase = async (req, res) => {
  const {
    nombre_desaparecido,
    edad,
    genero,
    fecha_desaparicion,
    ubicacion_desaparicion,
    descripcion,
    telefono_contacto,
    vestimenta,
    senas_particulares,
    estatura_cm,
    complexion,
    condicion_medica,
    lugar_frecuente,
    parentesco_reportante,
    direccion_vivienda,
    telefono_privado
  } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'La fotografía de la persona desaparecida es obligatoria.' });
  }

  const foto_url = `/uploads/${req.file.filename}`;

  if (
    !nombre_desaparecido ||
    !edad ||
    !genero ||
    !fecha_desaparicion ||
    !ubicacion_desaparicion ||
    !descripcion ||
    !telefono_contacto
  ) {
    return res.status(400).json({ error: 'Todos los campos básicos son obligatorios.' });
  }

  try {
    // Análisis y extracción biométrica InsightFace (512-D ArcFace + RetinaFace landmarks)
    let biometria = null;
    try {
      biometria = await insightFaceService.scanFace(foto_url);
    } catch (bioErr) {
      console.warn('[InsightFace] No se pudo completar el escaneo automático del archivo:', bioErr.message);
    }

    if (!biometria && req.body.biometria_insightface) {
      try {
        biometria = typeof req.body.biometria_insightface === 'string' 
          ? JSON.parse(req.body.biometria_insightface) 
          : req.body.biometria_insightface;
      } catch (e) {
        biometria = null;
      }
    }

    const biometriaValue = biometria ? (typeof biometria === 'string' ? biometria : JSON.stringify(biometria)) : null;

    const result = await db.query(
      `INSERT INTO casos (
        usuario_id, nombre_desaparecido, edad, genero, fecha_desaparicion,
        ubicacion_desaparicion, descripcion, telefono_contacto, foto_url, biometria_insightface,
        vestimenta, senas_particulares, estatura_cm, complexion, condicion_medica, lugar_frecuente,
        parentesco_reportante, direccion_vivienda, telefono_privado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        req.user.id,
        nombre_desaparecido,
        parseInt(edad),
        genero,
        fecha_desaparicion,
        ubicacion_desaparicion,
        descripcion,
        telefono_contacto,
        foto_url,
        biometriaValue,
        vestimenta || null,
        senas_particulares || null,
        estatura_cm ? parseInt(estatura_cm) : null,
        complexion || null,
        condicion_medica || null,
        lugar_frecuente || null,
        parentesco_reportante || 'Familiar',
        direccion_vivienda || null,
        telefono_privado !== undefined ? Boolean(telefono_privado) : true
      ]
    );

    return res.status(201).json({
      message: 'Caso de desaparición registrado con éxito.',
      caso: result.rows[0],
      biometria: biometria || null
    });
  } catch (error) {
    console.error('Error al crear caso:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor al guardar el caso.' });
  }
};

const getCases = async (req, res) => {
  const { search, estado } = req.query;
  const viewer = getOptionalUser(req);

  let queryText = `
    SELECT c.*, u.nombre as creador_nombre 
    FROM casos c
    JOIN usuarios u ON c.usuario_id = u.id
  `;
  const queryParams = [];
  let paramIndex = 1;
  const clauses = [];

  if (search) {
    clauses.push(`c.nombre_desaparecido ILIKE $${paramIndex}`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (estado) {
    clauses.push(`c.estado = $${paramIndex}`);
    queryParams.push(estado);
    paramIndex++;
  }

  if (clauses.length > 0) {
    queryText += ` WHERE ` + clauses.join(' AND ');
  }

  queryText += ` ORDER BY c.created_at DESC`;

  try {
    const result = await db.query(queryText, queryParams);
    const sanitized = (result.rows || []).map(c => sanitizeCaseForViewer(c, viewer));
    return res.status(200).json(sanitized);
  } catch (error) {
    console.error('Error al listar casos:', error);
    return res.status(500).json({ error: 'Ocurrió un error al obtener la lista de casos.' });
  }
};

const getCaseById = async (req, res) => {
  const { id } = req.params;
  const viewer = getOptionalUser(req);

  try {
    const result = await db.query(
      `SELECT c.*, 
              u.nombre as creador_nombre, 
              u.email as creador_email, 
              u.telefono as creador_telefono,
              u.selfie_url as creador_selfie_url
       FROM casos c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'El caso solicitado no existe.' });
    }

    const sanitized = sanitizeCaseForViewer(result.rows[0], viewer);
    return res.status(200).json(sanitized);
  } catch (error) {
    console.error('Error al obtener detalle del caso:', error);
    return res.status(500).json({ error: 'Ocurrió un error al cargar los detalles del caso.' });
  }
};

const updateCase = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const caseResult = await db.query('SELECT * FROM casos WHERE id = $1', [id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'El caso no existe.' });
    }
    const current = caseResult.rows[0];

    const canEdit = user.rol === 'administrador' || user.rol === 'moderador' || user.id === current.usuario_id;
    if (!canEdit) {
      return res.status(403).json({ error: 'No está autorizado para editar este caso. Acción exclusiva de Administrador o Moderador.' });
    }

    const {
      nombre_desaparecido,
      edad,
      genero,
      fecha_desaparicion,
      ubicacion_desaparicion,
      descripcion,
      direccion_vivienda,
      parentesco_reportante,
      telefono_contacto,
      vestimenta,
      senas_particulares,
      estado
    } = req.body;

    const updateResult = await db.query(
      `UPDATE casos SET 
        nombre_desaparecido = $1, edad = $2, genero = $3, fecha_desaparicion = $4,
        ubicacion_desaparicion = $5, descripcion = $6, direccion_vivienda = $7,
        parentesco_reportante = $8, telefono_contacto = $9, vestimenta = $10,
        senas_particulares = $11, estado = $12
       WHERE id = $13 RETURNING *`,
      [
        nombre_desaparecido || current.nombre_desaparecido,
        edad ? parseInt(edad) : current.edad,
        genero || current.genero,
        fecha_desaparicion || current.fecha_desaparicion,
        ubicacion_desaparicion || current.ubicacion_desaparicion,
        descripcion || current.descripcion,
        direccion_vivienda !== undefined ? direccion_vivienda : current.direccion_vivienda,
        parentesco_reportante || current.parentesco_reportante,
        telefono_contacto || current.telefono_contacto,
        vestimenta !== undefined ? vestimenta : current.vestimenta,
        senas_particulares !== undefined ? senas_particulares : current.senas_particulares,
        estado || current.estado,
        id
      ]
    );

    return res.status(200).json({
      message: 'Expediente actualizado exitosamente.',
      caso: updateResult.rows[0]
    });
  } catch (err) {
    console.error('Error al actualizar caso:', err);
    return res.status(500).json({ error: 'Error interno al actualizar el expediente.' });
  }
};

const deleteCase = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const caseResult = await db.query('SELECT * FROM casos WHERE id = $1', [id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'El caso no existe.' });
    }
    const current = caseResult.rows[0];

    const canDelete = user.rol === 'administrador' || user.rol === 'moderador' || user.id === current.usuario_id;
    if (!canDelete) {
      return res.status(403).json({ error: 'No está autorizado para eliminar este caso. Acción exclusiva de Administrador o Moderador.' });
    }

    await db.query('DELETE FROM casos WHERE id = $1', [id]);

    return res.status(200).json({
      message: 'Expediente eliminado correctamente del sistema.'
    });
  } catch (err) {
    console.error('Error al eliminar caso:', err);
    return res.status(500).json({ error: 'Error interno al eliminar el expediente.' });
  }
};

const updateCaseStatus = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado || (estado !== 'Desaparecido' && estado !== 'Encontrado')) {
    return res.status(400).json({ error: 'Estado inválido. Valores permitidos: "Desaparecido" o "Encontrado".' });
  }

  try {
    const caseResult = await db.query('SELECT usuario_id FROM casos WHERE id = $1', [id]);

    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Caso no encontrado.' });
    }

    const caso = caseResult.rows[0];
    const canChange = req.user.rol === 'administrador' || req.user.rol === 'moderador' || caso.usuario_id === req.user.id;

    if (!canChange) {
      return res.status(403).json({ error: 'No está autorizado para modificar este caso.' });
    }

    const updateResult = await db.query(
      'UPDATE casos SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );

    return res.status(200).json({
      message: 'El estado del caso ha sido actualizado.',
      caso: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar estado del caso:', error);
    return res.status(500).json({ error: 'Error interno del servidor al actualizar el estado del caso.' });
  }
};

const acceptSearch = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.user.id;

  try {
    const caseResult = await db.query('SELECT * FROM casos WHERE id = $1', [id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: `El caso con ID ${id} no existe.` });
    }

    const caso = caseResult.rows[0];

    if (caso.estado === 'Encontrado') {
      return res.status(400).json({ error: 'Este caso ya ha sido resuelto y marcado como Encontrado.' });
    }

    const fechaAceptacion = new Date().toISOString();
    const updateResult = await db.query(
      `UPDATE casos 
       SET estado = $1, usuario_asignado_id = $2, fecha_aceptacion = $3 
       WHERE id = $4 
       RETURNING *`,
      ['En Proceso de Rescate', usuarioId, fechaAceptacion, id]
    );

    const updatedCase = updateResult.rows[0];

    const { broadcast } = require('../wsServer');
    if (typeof broadcast === 'function') {
      broadcast('caso_actualizado', updatedCase);
    }

    return res.status(200).json({
      message: '¡Misión de rescate aceptada con éxito! La patrulla ha sido desplegada.',
      caso: updatedCase
    });
  } catch (error) {
    console.error('Error al aceptar búsqueda del caso:', error);
    return res.status(500).json({ error: 'Ocurrió un error al procesar la aceptación de la búsqueda.' });
  }
};

const getRescueStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const caseResult = await db.query('SELECT * FROM casos WHERE id = $1', [id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: `El caso con ID ${id} no existe.` });
    }

    const caso = caseResult.rows[0];
    const enProceso = caso.estado === 'En Proceso de Rescate';

    return res.status(200).json({
      caso_id: parseInt(id),
      estado: caso.estado,
      en_proceso_rescate: enProceso,
      usuario_asignado_id: caso.usuario_asignado_id || null,
      rescatista_nombre: caso.rescatista_nombre || null,
      fecha_aceptacion: caso.fecha_aceptacion || null
    });
  } catch (error) {
    console.error('Error al consultar estado de rescate:', error);
    return res.status(500).json({ error: 'Error al consultar estado de rescate del caso.' });
  }
};

const getCaseDossier = async (req, res) => {
  const { id } = req.params;
  const caseId = parseInt(id);
  const viewer = getOptionalUser(req);

  try {
    const caseResult = await db.query(
      `SELECT c.*, 
              u.nombre as creador_nombre, 
              u.email as creador_email, 
              u.telefono as creador_telefono,
              u.selfie_url as creador_selfie_url
       FROM casos c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = $1`,
      [caseId]
    );

    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'El expediente solicitado no existe.' });
    }

    const rawCaso = caseResult.rows[0];
    const caso = sanitizeCaseForViewer(rawCaso, viewer);

    const alertsResult = await db.query(
      `SELECT a.*, LOWER(COALESCE(ea.nombre, a.estado, 'pendiente')) as estado
       FROM alertas a
       LEFT JOIN estados_alerta ea ON a.id_estado_alerta = ea.id
       WHERE a.caso_id = $1
       ORDER BY COALESCE(a.fecha_deteccion, a.created_at) DESC`,
      [caseId]
    );

    const alerts = alertsResult.rows || [];

    const heatmapPoints = alerts
      .map((a) => {
        const lat = parseFloat(a.ubicacion_lat || a.lat);
        const lng = parseFloat(a.ubicacion_lng || a.lng);
        if (isNaN(lat) || isNaN(lng)) return null;
        const confidence = parseFloat(a.porcentaje_confianza || 75);
        return [lat, lng, confidence / 100];
      })
      .filter(Boolean);

    const timeline = [];
    timeline.push({
      tipo: 'registro_caso',
      titulo: 'Expediente Inicial Registrado',
      descripcion: `Último lugar de contacto: ${caso.ubicacion_desaparicion}.`,
      fecha: caso.created_at || caso.fecha_desaparicion,
      icono: '📋'
    });

    alerts.forEach((a) => {
      const fecha = a.fecha_deteccion || a.created_at;
      const isCamera = a.tipo_origen === 'Cámara IP' || a.tipo_origen === 'Camara IP' || a.tipo_origen === 'CCTV';
      timeline.push({
        tipo: isCamera ? 'deteccion_camara' : 'avistamiento_ciudadano',
        titulo: isCamera ? `Detección Facial Automática (${a.porcentaje_confianza || 80}%)` : 'Avistamiento Reportado por Ciudadano',
        descripcion: a.ubicacion_nombre || a.ubicacion_texto || 'Ubicación registrada por sensor',
        fecha,
        alerta_id: a.id,
        foto_evidencia_url: a.foto_evidencia_url,
        estado: a.estado,
        coordenadas: [a.ubicacion_lat, a.ubicacion_lng],
        icono: isCamera ? '📹' : '👤'
      });
    });

    if (caso.estado === 'Encontrado') {
      timeline.unshift({
        tipo: 'caso_resuelto',
        titulo: 'Persona Localizada con Éxito',
        descripcion: 'El caso fue resuelto satisfactoriamente y la persona ha sido resguardada.',
        fecha: caso.updated_at || new Date().toISOString(),
        icono: '✅'
      });
    }

    return res.status(200).json({
      caso,
      alertas: alerts,
      heatmapPoints,
      totalEvidencias: alerts.length,
      timeline
    });
  } catch (error) {
    console.error('Error al obtener expediente forense (dossier):', error);
    return res.status(500).json({ error: 'Error al cargar el expediente forense del caso.' });
  }
};

module.exports = {
  createCase,
  getCases,
  getCaseById,
  updateCase,
  deleteCase,
  updateCaseStatus,
  acceptSearch,
  getRescueStatus,
  getCaseDossier
};

