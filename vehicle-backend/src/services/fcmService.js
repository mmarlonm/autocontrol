const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const UserModel = require('../models/userModel');
require('dotenv').config();

let firebaseInitialized = admin.apps.length > 0;

if (admin.apps.length > 0) {
  console.log('[FCM] Firebase Admin SDK inicializado desde instancia compartida.');
} else {
  // Intentar inicializar Firebase Admin si existe archivo de credenciales
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.join(__dirname, '../config/firebase-service-account.json');

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === 'string'
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
    console.log('[FCM] Firebase Admin SDK inicializado exitosamente desde FIREBASE_SERVICE_ACCOUNT_JSON.');
  } catch (err) {
    console.warn('[FCM] Error inicializando Firebase Admin desde JSON en ENV:', err.message);
  }
} else if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
    console.log('[FCM] Firebase Admin SDK inicializado exitosamente desde archivo.');
  } catch (err) {
    console.warn('[FCM] No se pudo inicializar Firebase Admin desde archivo:', err.message);
  }
} else {
  console.log('[FCM] No se encontró credencial en ' + serviceAccountPath + '. Modo simulación activo.');
}
}

const FcmService = {
  /**
   * Envía notificación Push al token FCM de un usuario.
   * Maneja errores y tokens inválidos/desinstalados (CRITICAL VALIDATION).
   */
  sendNotification: async (fcmToken, { title, body, data = {} }) => {
    if (!fcmToken) {
      console.log('[FCM] Usuario sin token FCM registrado. Notificación omitida.');
      return { success: false, reason: 'NO_TOKEN' };
    }

    // Si Firebase Admin está configurado con credenciales reales
    if (firebaseInitialized) {
      const message = {
        token: fcmToken,
        notification: {
          title,
          body
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
          priority: 'high',
          notification: {
            color: '#18b0b8',
            sound: 'default'
          }
        }
      };

      try {
        const response = await admin.messaging().send(message);
        console.log(`[FCM] Notificación enviada con éxito a ${fcmToken}:`, response);
        return { success: true, messageId: response };
      } catch (error) {
        console.error('[FCM] Error al enviar notificación:', error.code, error.message);

        // VALIDACIÓN CRÍTICA: FCM maneja tokens inválidos (remover si el dispositivo desinstala)
        const invalidCodes = [
          'messaging/invalid-registration-token',
          'messaging/registration-token-not-registered',
          'messaging/invalid-argument'
        ];

        if (invalidCodes.includes(error.code) || (error.message && error.message.includes('not a valid FCM registration token'))) {
          console.warn(`[FCM] Token FCM inválido o desinstalado detectado (${fcmToken}). Removiendo de la base de datos.`);
          await UserModel.clearInvalidFcmToken(fcmToken);
          return { success: false, reason: 'TOKEN_REMOVED', error: error.code };
        }

        return { success: false, reason: 'SEND_FAILED', error: error.message };
      }
    }

    // Modo simulación de FCM (útil para pruebas locales, desarrollo y CI)
    console.log(`[FCM SIMULADOR] Push enviado a token [${fcmToken}]:`);
    console.log(`  -> Título: ${title}`);
    console.log(`  -> Mensaje: ${body}`);
    console.log(`  -> Metadata:`, data);

    // Simular detección de token explícitamente inválido si contiene 'invalid'
    if (fcmToken.includes('invalid_token')) {
      console.warn(`[FCM SIMULADOR] Token inválido detectado (${fcmToken}). Removiendo de la base de datos.`);
      await UserModel.clearInvalidFcmToken(fcmToken);
      return { success: false, reason: 'TOKEN_REMOVED' };
    }

    return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
  }
};

module.exports = FcmService;

