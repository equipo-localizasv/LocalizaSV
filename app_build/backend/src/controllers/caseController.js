const db = require('../config/database');
const insightFaceService = require('../services/insightFaceService');

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
    lugar_frecuente
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
        vestimenta, senas_particulares, estatura_cm, complexion, condicion_medica, lugar_frecuente
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
        lugar_frecuente || null
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
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al listar casos:', error);
    return res.status(500).json({ error: 'Ocurrió un error al obtener la lista de casos.' });
  }
};

const getCaseById = async (req, res) => {
  const { id } = req.params;

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

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener detalle del caso:', error);
    return res.status(500).json({ error: 'Ocurrió un error al cargar los detalles del caso.' });
  }
};

const updateCaseStatus = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado || (estado !== 'Desaparecido' && estado !== 'Encontrado')) {
    return res.status(400).json({ error: 'Estado inválido. Valores permitidos: "Desaparecido" o "Encontrado".' });
  }

  try {
    // Check ownership of the case
    const caseResult = await db.query('SELECT usuario_id FROM casos WHERE id = $1', [id]);

    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Caso no encontrado.' });
    }

    const caso = caseResult.rows[0];

    if (caso.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No está autorizado para modificar este caso. Solo el usuario creador puede hacerlo.' });
    }

    // Update status
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

/**
 * Tarea 5: Endpoint aceptar búsqueda
 * PUT /api/casos/:id/aceptar
 * Registra que un usuario voluntario/rescatista aceptó la búsqueda activa
 */
const acceptSearch = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.user.id;

  try {
    const caseResult = await db.query('SELECT * FROM casos WHERE id = $1', [id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: `El caso con ID ${id} no existe.` });
    }

    const caso = caseResult.rows[0];

    // Verificar si el caso ya fue resuelto
    if (caso.estado === 'Encontrado') {
      return res.status(400).json({ error: 'Este caso ya ha sido resuelto y marcado como Encontrado.' });
    }

    // Verificar que el caso no tenga ya un usuario asignado activo
    if (caso.usuario_asignado_id && caso.usuario_asignado_id !== usuarioId && caso.estado === 'En Proceso de Rescate') {
      return res.status(400).json({
        error: 'Este caso ya tiene un voluntario asignado en proceso de rescate activo.'
      });
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

    // Emitir evento en tiempo real vía WebSocket
    const { broadcast } = require('../wsServer');
    if (typeof broadcast === 'function') {
      broadcast('caso_actualizado', updatedCase);
    }

    return res.status(200).json({
      message: '¡Has aceptado la búsqueda de este caso! El estado ha cambiado a "En Proceso de Rescate".',
      caso: updatedCase
    });
  } catch (error) {
    console.error('Error al aceptar búsqueda del caso:', error);
    return res.status(500).json({ error: 'Ocurrió un error al procesar la aceptación de la búsqueda.' });
  }
};

/**
 * Tarea 6: Endpoint estado de rescate
 * GET /api/casos/:id/estado
 * Devuelve el estado operativo de rescate para desplegar el banner dinámico
 */
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

/**
 * Tarea: Expediente Forense Integral (Dossier con Galería de Evidencias, Heatmap GPS y Cronología)
 * GET /api/cases/:id/dossier
 */
const getCaseDossier = async (req, res) => {
  const { id } = req.params;
  const caseId = parseInt(id);

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

    const caso = caseResult.rows[0];

    // Consultar todas las alertas, detecciones de cámaras y avistamientos comunitarios
    const alertsResult = await db.query(
      `SELECT a.*, LOWER(COALESCE(ea.nombre, a.estado, 'pendiente')) as estado
       FROM alertas a
       LEFT JOIN estados_alerta ea ON a.id_estado_alerta = ea.id
       WHERE a.caso_id = $1
       ORDER BY COALESCE(a.fecha_deteccion, a.created_at) DESC`,
      [caseId]
    );

    const alerts = alertsResult.rows || [];

    // Extraer puntos GPS para el mapa de calor específico de este caso
    const heatmapPoints = alerts
      .map((a) => {
        const lat = parseFloat(a.ubicacion_lat || a.lat);
        const lng = parseFloat(a.ubicacion_lng || a.lng);
        if (isNaN(lat) || isNaN(lng)) return null;
        const confidence = parseFloat(a.porcentaje_confianza || 75);
        return [lat, lng, confidence / 100];
      })
      .filter(Boolean);

    // Timeline cronológico forense
    const timeline = [];
    timeline.push({
      tipo: 'registro_caso',
      titulo: 'Expediente Inicial Registrado',
      descripcion: `Reportado por ${caso.creador_nombre}. Último lugar de contacto: ${caso.ubicacion_desaparicion}.`,
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
  updateCaseStatus,
  acceptSearch,
  getRescueStatus,
  getCaseDossier
};

