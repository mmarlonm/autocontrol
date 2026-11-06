const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Solo cargar .env en desarrollo (no existe en producción en Render)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}

// Inicializar Firebase Admin SDK si no ha sido inicializado
if (!admin.apps.length) {
  let initialized = false;

  // 1. Prioridad: Variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON (Render / Railway / Cloud)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const creds = typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      admin.initializeApp({
        credential: admin.credential.cert(creds)
      });
      initialized = true;
      console.log('[DATABASE] ✅ Firebase Admin inicializado desde FIREBASE_SERVICE_ACCOUNT_JSON');
    } catch (err) {
      console.error('[DATABASE] Error parseando FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
    }
  }

  // 2. Prioridad: Ruta especificada en FIREBASE_SERVICE_ACCOUNT_PATH
  if (!initialized && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const customPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(customPath)) {
      try {
        const creds = require(customPath);
        admin.initializeApp({
          credential: admin.credential.cert(creds)
        });
        initialized = true;
        console.log(`[DATABASE] ✅ Firebase Admin inicializado desde ${customPath}`);
      } catch (err) {
        console.error(`[DATABASE] Error cargando credencial desde ${customPath}:`, err.message);
      }
    }
  }

  // 3. Prioridad: Archivo de credenciales locales en src/config
  if (!initialized) {
    try {
      const configDir = __dirname;
      const files = fs.readdirSync(configDir);
      const serviceAccountFile = files.find(f => 
        (f.includes('firebase-adminsdk') || f.includes('firebase-service-account')) && f.endsWith('.json')
      );
      if (serviceAccountFile) {
        const fullPath = path.join(configDir, serviceAccountFile);
        const creds = require(fullPath);
        admin.initializeApp({
          credential: admin.credential.cert(creds)
        });
        initialized = true;
        console.log(`[DATABASE] ✅ Firebase Admin inicializado desde ${serviceAccountFile}`);
      }
    } catch (err) {
      console.warn('[DATABASE] Aviso al buscar credenciales locales:', err.message);
    }
  }

  // 4. Fallback: Project ID
  if (!initialized) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'vehicle-bd'
    });
    console.log('[DATABASE] ⚠️ Firebase Admin inicializado con Project ID.');
  }
}

const db = admin.firestore();

try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // Ignorar si ya fue configurado previamente
}

console.log('✅ Conectado a Firebase Firestore (NoSQL)');

const collections = {
  users: db.collection('users'),
  vehicles: db.collection('vehicles'),
  vehicleTenencias: db.collection('vehicleTenencias'),
  notifications: db.collection('notifications'),
  vehicleHistory: db.collection('vehicleHistory')
};

/**
 * Inicializar / verificar conexión a Firestore
 */
const initDatabase = async () => {
  try {
    console.log('[DATABASE] 🔄 Verificando colecciones Firestore (users, vehicles, vehicleTenencias, notifications, vehicleHistory)...');
    await collections.users.limit(1).get();
    console.log('✅ Firebase Firestore listo para operaciones.');
  } catch (err) {
    if (err.message && err.message.includes('SERVICE_DISABLED')) {
      console.error('⚠️ [FIRESTORE] Cloud Firestore API no está habilitada en tu proyecto Firebase.');
      console.error('👉 Habilítala creando la base de datos en: https://console.firebase.google.com/project/vehicle-bd/firestore');
    } else {
      console.warn('[DATABASE] Aviso en initDatabase:', err.message);
    }
  }
};

/**
 * Helper de compatibilidad para consultas SQL legacy
 */
const query = {
  all: async (sql, params = []) => {
    // Caso de compatibilidad con notifyUsersAfterScrape en cronService
    if (sql && sql.includes('FROM users') && sql.includes('vehicles')) {
      try {
        const usersSnap = await collections.users.where('fcm_token', '!=', null).get();
        const results = [];
        for (const uDoc of usersSnap.docs) {
          const u = uDoc.data();
          const vSnap = await collections.vehicles.where('user_id', '==', uDoc.id).limit(1).get();
          if (!vSnap.empty) {
            const v = vSnap.docs[0].data();
            const tSnap = await collections.vehicleTenencias
              .where('vehicle_id', '==', vSnap.docs[0].id)
              .get();
            let t = {};
            if (!tSnap.empty) {
              const docs = tSnap.docs.map(d => d.data());
              docs.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
              t = docs[0];
            }
            results.push({
              id: uDoc.id,
              email: u.email,
              fcm_token: u.fcm_token,
              plate: v.plate,
              total_due: t.total_due || 0,
              due_date: t.due_date || '',
              subsidy_active: t.subsidy_active || 0
            });
          }
        }
        return results;
      } catch (e) {
        console.error('[DATABASE.query.all] Error en consulta de compatibilidad:', e.message);
        return [];
      }
    }
    return [];
  },
  run: async () => ({ lastID: 1, changes: 1 }),
  get: async () => null,
  exec: async () => {}
};

module.exports = {
  db,
  admin,
  collections,
  initDatabase,
  query
};
