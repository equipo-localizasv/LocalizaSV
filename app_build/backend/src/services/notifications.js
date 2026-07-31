const admin = require('firebase-admin');
const db = require('../config/database');

let fcmInitialized = false;

const projectId = process.env.FCM_PROJECT_ID;
const clientEmail = process.env.FCM_CLIENT_EMAIL;
const privateKey = process.env.FCM_PRIVATE_KEY;

if (projectId && clientEmail && privateKey) {
  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey
      })
    });
    fcmInitialized = true;
    console.log('Firebase Cloud Messaging (FCM) inicializado exitosamente.');
  } catch (error) {
    console.error('Error al inicializar Firebase Admin SDK:', error);
  }
} else {
  console.warn('⚠️ Credenciales de FCM ausentes. Ejecutando notificaciones en modo simulador (FCM Mock Mode).');
}

/**
 * Envía una notificación push a todos los tokens registrados.
 * @param {string} title Título de la notificación
 * @param {string} body Cuerpo del mensaje
 * @param {object} data Datos adicionales (ej. enlaces)
 */
const sendNotificationToAll = async (title, body, data = {}) => {
  try {
    const result = await db.query('SELECT token FROM tokens_fcm');
    const tokens = result.rows.map(row => row.token);

    if (tokens.length === 0) {
      console.log('[FCM] No hay tokens de dispositivos registrados. Omitiendo envío.');
      return;
    }

    if (fcmInitialized) {
      const message = {
        notification: { title, body },
        data: data || {},
        tokens: tokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`[FCM] Envío multicast completado. Éxitos: ${response.successCount}, Fallidos: ${response.failureCount}`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              const failedToken = tokens[idx];
              console.log(`[FCM Cleanup] Eliminando token inválido/obsoleto de la BD: ${failedToken}`);
              db.query('DELETE FROM tokens_fcm WHERE token = $1', [failedToken]).catch(err => {
                console.error('Error al limpiar token de la BD:', err);
              });
            }
          }
        });
      }
    } else {
      console.log(
        `\n📢 --- [SIMULADOR NOTIFICACIÓN FCM PUSH] ---` +
        `\n📲 Dispositivos Destino (${tokens.length}): ${JSON.stringify(tokens)}` +
        `\n🏷️ Título: ${title}` +
        `\n💬 Cuerpo: ${body}` +
        `\n🔗 Datos Adjuntos: ${JSON.stringify(data)}` +
        `\n---------------------------------------------\n`
      );
    }
  } catch (error) {
    console.error('Error al enviar notificaciones push:', error);
  }
};

module.exports = {
  sendNotificationToAll
};
