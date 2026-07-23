const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuración del Script
const CONFIG = {
  // 1. URL de la cámara de seguridad (ejemplo: http://192.168.1.100:8080/snapshot.jpg)
  CAMERA_URL: process.env.CAMERA_URL || 'http://192.168.1.100:8080/snapshot.jpg',

  // Endpoint POST /api/detecciones de LocalizaSV
  API_URL: process.env.API_URL || 'http://localhost:3001/api/detecciones',

  // Intervalo de captura en segundos (ejemplo: capturar cada 5 segundos)
  INTERVAL_SECONDS: parseInt(process.env.INTERVAL_SECONDS) || 5,

  // Nombre y ruta de la imagen guardar temporalmente
  TEMP_IMAGE_PATH: path.join(__dirname, 'temp_snapshot.jpg'),

  // Datos fijos para pruebas de detección
  DETECTION_DATA: {
    caso_id: 1, // ID de caso existente para pruebas
    ubicacion_lat: 13.6929,
    ubicacion_lng: -89.2182,
    porcentaje_confianza: 94.5
  }
};

/**
 * Función que realiza un ciclo completo de captura, guardado temporal,
 * envío al backend de LocalizaSV y eliminación del archivo temporal.
 */
async function procesarCapturaCamara() {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n[${timestamp}] 📷 Capturando imagen desde: ${CONFIG.CAMERA_URL}...`);

  try {
    // 1. Conectarse a la URL de la cámara de seguridad y descargar la imagen
    const responseCamera = await axios.get(CONFIG.CAMERA_URL, {
      responseType: 'arraybuffer'
    });

    // 2. Guardar la imagen capturada temporalmente en el sistema de archivos
    fs.writeFileSync(CONFIG.TEMP_IMAGE_PATH, responseCamera.data);
    console.log(`💾 Imagen guardada temporalmente en: ${CONFIG.TEMP_IMAGE_PATH}`);

    // Convertir buffer a base64 Data URL para el atributo foto_evidencia_url
    const base64Image = Buffer.from(responseCamera.data).toString('base64');
    const fotoEvidenciaUrl = `data:image/jpeg;base64,${base64Image}`;

    // 3 y 4. Preparar el envío con datos fijos (caso_id, lat, lng, confianza) e imagen
    const payload = {
      caso_id: CONFIG.DETECTION_DATA.caso_id,
      ubicacion_lat: CONFIG.DETECTION_DATA.ubicacion_lat,
      ubicacion_lng: CONFIG.DETECTION_DATA.ubicacion_lng,
      porcentaje_confianza: CONFIG.DETECTION_DATA.porcentaje_confianza,
      foto_evidencia_url: fotoEvidenciaUrl
    };

    console.log(`🚀 Enviando datos de detección al endpoint POST /api/detecciones...`);
    const responseApi = await axios.post(CONFIG.API_URL, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`✅ ¡Detección registrada exitosamente!`);
    console.log(`   Respuesta del Servidor:`, responseApi.data.message || responseApi.data);

  } catch (error) {
    if (error.response) {
      console.error(`❌ Error devuelto por la API (${error.response.status}):`, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Connection Refused: No se pudo establecer conexión con ${error.config?.url}`);
    } else {
      console.error(`❌ Error durante el proceso:`, error.message);
    }
  } finally {
    // 5. Eliminar el archivo temporal del disco
    if (fs.existsSync(CONFIG.TEMP_IMAGE_PATH)) {
      try {
        fs.unlinkSync(CONFIG.TEMP_IMAGE_PATH);
        console.log(`🗑️ Archivo temporal eliminado.`);
      } catch (err) {
        console.error(`⚠️ No se pudo eliminar el archivo temporal:`, err.message);
      }
    }
  }
}

/**
 * 6. Bucle principal para ejecutar la captura periódicamente
 */
function iniciarScriptCamara() {
  console.log('===========================================================');
  console.log('🎥 LocalizaSV - Agente de Simulación y Captura de Cámaras');
  console.log(`• URL Cámara: ${CONFIG.CAMERA_URL}`);
  console.log(`• Endpoint Backend: ${CONFIG.API_URL}`);
  console.log(`• Frecuencia: Cada ${CONFIG.INTERVAL_SECONDS} segundos`);
  console.log('===========================================================\n');

  // Ejecución inicial inmediata
  procesarCapturaCamara();

  // Ejecución periódica cada X segundos
  setInterval(procesarCapturaCamara, CONFIG.INTERVAL_SECONDS * 1000);
}

// Iniciar el script
iniciarScriptCamara();
