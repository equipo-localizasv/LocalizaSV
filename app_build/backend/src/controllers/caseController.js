const db = require('../config/database');

const createCase = async (req, res) => {
  const {
    nombre_desaparecido,
    edad,
    genero,
    fecha_desaparicion,
    ubicacion_desaparicion,
    descripcion,
    telefono_contacto
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
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO casos (
        usuario_id, nombre_desaparecido, edad, genero, fecha_desaparicion,
        ubicacion_desaparicion, descripcion, telefono_contacto, foto_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        foto_url
      ]
    );

    return res.status(201).json({
      message: 'Caso de desaparición registrado con éxito.',
      caso: result.rows[0]
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

module.exports = {
  createCase,
  getCases,
  getCaseById,
  updateCaseStatus,
  acceptSearch,
  getRescueStatus
};

