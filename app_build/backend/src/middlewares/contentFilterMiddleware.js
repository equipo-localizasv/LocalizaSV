const { containsOffensiveWords, isImageOffensive } = require('../services/contentFilterService');
const fs = require('fs');

/**
 * Middleware to filter offensive content from text fields and uploaded files.
 */
const contentFilterMiddleware = async (req, res, next) => {
  try {
    // 1. Check text fields (e.g. nombre)
    if (req.body.nombre && containsOffensiveWords(req.body.nombre)) {
      // Remove uploaded file if it exists since request is rejected
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'El nombre contiene palabras inapropiadas o no permitidas.' });
    }

    // 2. Check image file if provided
    if (req.file && req.file.path) {
      const isOffensive = await isImageOffensive(req.file.path);
      if (isOffensive) {
        // Remove uploaded file since it's rejected
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'La imagen subida contiene contenido inapropiado o no permitido.' });
      }
    }

    next();
  } catch (error) {
    console.error('Error in contentFilterMiddleware:', error);
    next(error);
  }
};

module.exports = contentFilterMiddleware;
