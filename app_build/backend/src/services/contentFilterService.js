let vision;
try {
  vision = require('@google-cloud/vision');
} catch (e) {
  console.warn('⚠️ [Vision] @google-cloud/vision no disponible. Filtro de imágenes deshabilitado en modo local.');
}
const path = require('path');

// Simple profanity list for demonstration
const BAD_WORDS = [
  'puto', 'puta', 'mierda', 'cabron', 'cabrona', 'pendejo', 'pendeja', 
  'idiota', 'estupido', 'estupida', 'imbecil', 'zorra', 'maricon', 'cerdo', 'cerda'
];

/**
 * Checks if text contains offensive words.
 * @param {string} text 
 * @returns {boolean} true if offensive, false otherwise
 */
const containsOffensiveWords = (text) => {
  if (!text) return false;
  
  const normalizedText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = normalizedText.split(/[\s,.-]+/);
  
  for (const word of words) {
    if (BAD_WORDS.includes(word)) {
      return true;
    }
  }
  return false;
};

/**
 * Uses Google Cloud Vision SafeSearch to check for offensive imagery.
 * @param {string} filePath Absolute path to the file
 * @returns {Promise<boolean>} true if offensive, false otherwise
 */
const isImageOffensive = async (filePath) => {
  if (!vision) return false;
  try {
    // Note: To use Google Cloud Vision, process.env.GOOGLE_APPLICATION_CREDENTIALS must be set
    // pointing to a valid service account JSON key.
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.safeSearchDetection(filePath);
    const detections = result.safeSearchAnnotation;
    
    if (!detections) return false;

    // Check if any category is likely or very likely to be offensive
    const badCategories = ['adult', 'medical', 'spoof', 'violence', 'racy'];
    for (const category of badCategories) {
      if (detections[category] === 'LIKELY' || detections[category] === 'VERY_LIKELY') {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error in Google Cloud Vision SafeSearch:', error);
    // If credentials are not set or there's an API error, we log it.
    // Depending on strictness, we might return false to not allow blocking users if service is down,
    // or return true to be strictly safe. We'll return false (allow) on error to avoid blocking the app.
    return false;
  }
};

module.exports = {
  containsOffensiveWords,
  isImageOffensive
};
