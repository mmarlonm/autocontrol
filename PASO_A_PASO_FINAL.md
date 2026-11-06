# Vehicle Management App - PASO A PASO FINAL

## 📊 Estado Actual

| Componente | Estado | Detalles |
|-----------|--------|---------|
| ✅ Supabase PostgreSQL | DONE | Tablas creadas y funcionando |
| ✅ Backend Node.js | DONE | Rutas, controllers, servicios |
| ✅ Frontend React Native | DONE | Screens y navegación básica |
| ✅ Scraper Python | DONE | Lógica de scraping lista |
| ✅ Firebase Service Account | DONE | Archivo descargado |
| ⚠️ Endpoint Scraper | FALTA | Crear /api/scraper/run |
| ⚠️ Firebase en App | FALTA | Recibir push notifications |
| ⚠️ Deploy Railway | FALTA | Subir API a servidor |
| ⚠️ Cron Job | FALTA | Configurar ejecución 8 AM |
| ⚠️ Deploy App Móvil | FALTA | Build y distribuir |

---

# ✅ PASO 1: Crear Endpoint /api/scraper/run

**Por qué:** Para que cron-job.org pueda disparar el scraper a las 8 AM

**Archivo:** `vehicle-backend/src/routes/scraperRoutes.js`

Agregue al final:

```javascript
// Endpoint para ejecutar scraper manualmente (usado por cron-job.org)
router.post('/run', async (req, res) => {
  try {
    // Validar token de scraper (opcional, para seguridad)
    const scraperToken = req.headers['x-scraper-token'];
    if (scraperToken && scraperToken !== process.env.SCRAPER_TOKEN) {
      return res.status(403).json({ 
        success: false, 
        error: 'Token inválido' 
      });
    }

    console.log('[ScraperRoute] Ejecutando scraper manualmente...');
    const result = await runPythonScraper();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Scraper ejecutado exitosamente',
      result 
    });
  } catch (error) {
    console.error('[ScraperRoute] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
```

**Verificar en localhost:**
```bash
curl -X POST http://localhost:3000/api/scraper/run
# Respuesta esperada:
{
  "success": true,
  "message": "Scraper ejecutado exitosamente",
  "result": { ... }
}
```

✅ **DONE**

---

# ✅ PASO 2: Configurar Firebase en la App Móvil

**Por qué:** Para recibir push notifications del backend

### 2.1 Agregar Firebase a app.json

**Archivo:** `vehicle-app/app.json`

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-firebase/app"
      ],
      [
        "react-native-firebase/messaging"
      ]
    ]
  }
}
```

### 2.2 Crear Notification Handler

**Archivo:** `vehicle-app/src/services/notificationHandler.js`

```javascript
import { useEffect } from 'react';
import * as messaging from 'react-native-firebase/messaging';

export const useNotificationHandler = () => {
  useEffect(() => {
    // Permisos de notificación
    const requestPermission = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const isAuthorized =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (isAuthorized) {
          // Obtener token FCM
          const token = await messaging().getToken();
          console.log('FCM Token:', token);
          
          // Guardar token en AsyncStorage y enviar al backend
          await saveTokenToBackend(token);
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    // Listener para mensajes en foreground
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('Notificación recibida:', remoteMessage);
      // Guardar en lista de notificaciones
    });

    requestPermission();

    return unsubscribe;
  }, []);
};

async function saveTokenToBackend(fcmToken) {
  const token = await AsyncStorage.getItem('token');
  try {
    await fetch('https://tu-api.railway.app/api/auth/update-fcm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fcm_token: fcmToken })
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}
```

### 2.3 Usar en App.js

**Archivo:** `vehicle-app/App.js`

```javascript
import { useNotificationHandler } from './src/services/notificationHandler';

function RootNavigator() {
  useNotificationHandler(); // Agregar esta línea
  
  // ... resto del código
}
```

✅ **DONE**

---

# ✅ PASO 3: Agregar endpoint para actualizar FCM Token

**Por qué:** Guardar el token FCM del dispositivo en la BD

**Archivo:** `vehicle-backend/src/routes/authRoutes.js`

Agregue esta ruta:

```javascript
router.post('/update-fcm', verifyToken, async (req, res) => {
  try {
    const { fcm_token } = req.body;
    if (!fcm_token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token es requerido'
      });
    }

    const updated = await UserModel.updateFcmToken(req.user.id, fcm_token);
    
    return res.status(200).json({
      success: true,
      message: 'FCM token actualizado',
      data: { fcm_token: updated.fcm_token }
    });
  } catch (error) {
    console.error('[AuthController.updateFcm] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

✅ **DONE**

---

# ✅ PASO 4: Configurar API URL en Frontend para Producción

**Por qué:** Cambiar de localhost a la URL real de Railway

### 4.1 Crear archivo de config

**Archivo:** `vehicle-app/src/config/api.js`

```javascript
const API_URL = __DEV__ 
  ? 'http://localhost:3000'
  : 'https://vehicle-mgm-production.up.railway.app';

export default API_URL;
```

### 4.2 Usar en services/api.js

```javascript
import API_URL from '../config/api';

export async function signup(email, password, fcmToken) {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    // ... resto del código
  });
  // ...
}
```

✅ **DONE**

---

# 🚀 PASO 5: DEPLOY A RAILWAY.APP (El Paso Crítico)

### 5.1 Preparar repositorio

```bash
cd "G:\dev\devMGM\vehicle-mgm"

# Asegurar que todo está commiteado
git status

# Debe estar limpio, sin cambios sin guardar
git add .
git commit -m "feat: final configuration before railway deployment"
git push origin main
```

### 5.2 Crear cuenta en Railway (si no tienes)

1. Ir a: https://railway.app
2. Click "Start Free"
3. Login con GitHub
4. Autorizar a Railway

### 5.3 Desplegar Proyecto

1. En Railway Dashboard: Click "New Project"
2. Seleccionar "Deploy from GitHub Repo"
3. Buscar: `vehicle-mgm`
4. Seleccionar rama: `main`
5. Click "Deploy Now"

⏳ **Esperar 3-5 minutos mientras Railway:**
- Descarga código
- npm install
- npm start
- Despliega en servidor

### 5.4 Configurar Variables de Entorno

Una vez que Railway crea el proyecto:

1. En Dashboard, click en tu proyecto "vehicle-mgm"
2. Click en servicio "vehicle-backend"
3. Ir a tab "Variables"
4. Agregar estas variables:

```
DATABASE_URL = postgresql://postgres:<PASSWORD>@db.vsnqtjqnmbzgoztkmalr.supabase.co:5432/postgres

NODE_ENV = production

JWT_SECRET = supersecretjwtkey_autocontrol_mexico_2026_production

FIREBASE_SERVICE_ACCOUNT_PATH = ./src/config/firebase-service-account.json

PYTHON_PATH = python3

SCRAPER_SCRIPT_PATH = ./scrapers/main.py

CRON_SCHEDULE = 0 8 * * *

FRONTEND_URL = https://vehicle-mgm.expo.dev
```

### 5.5 Agregar Firebase Service Account

1. Abrir localmente: `vehicle-backend/src/config/firebase-service-account.json`
2. Copiar TODO el contenido (es JSON largo)
3. En Railway, agregar variable:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value:** [Pega TODO el JSON]
4. Save

### 5.6 Editar código para leer Firebase desde variable

**Archivo:** `vehicle-backend/src/config/database.js`

En la sección de inicialización de Firebase, agregar:

```javascript
// Si la variable de entorno existe (para Railway)
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
  } catch (err) {
    console.warn('[FCM] No se pudo parsear FIREBASE_SERVICE_ACCOUNT_JSON');
  }
}
```

### 5.7 Verificar que funciona

Esperar a que Railway termine de desplegar, luego:

```bash
# Test health endpoint
curl https://vehicle-mgm-production.up.railway.app/health

# Respuesta esperada:
{
  "status": "ok",
  "service": "AutoControl México - Backend API",
  "time": "2026-11-05T22:00:00Z"
}

# Test signup
curl -X POST https://vehicle-mgm-production.up.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

✅ **API DESPLEGADA**

---

# 🕐 PASO 6: Configurar Cron Job (Scraper 8 AM)

**Por qué:** Ejecutar scraper automáticamente cada día a las 8 AM

### 6.1 Crear cuenta en Cron-Job.org

1. Ir a: https://cron-job.org
2. Click "Sign up" (o usar Google/GitHub login)
3. Confirmar email

### 6.2 Crear Cron Job

1. En Dashboard, click "Create cronjob"
2. Configurar:
   - **Title:** `Vehicle Scraper 8AM`
   - **URL:** `https://vehicle-mgm-production.up.railway.app/api/scraper/run`
   - **Schedule:** 
     - Execution time: `08:00` (AM)
     - Days: `Every day`
     - Timezone: `America/Mexico_City`
   - **HTTP Method:** `POST`
   - **Optional headers:**
     ```
     X-Scraper-Token: tu_token_secreto
     ```
   - **Notification email:** Tu email
3. Click "Create"

### 6.3 Verificar que funciona

```bash
# Probar manualmente
curl -X POST https://vehicle-mgm-production.up.railway.app/api/scraper/run \
  -H "X-Scraper-Token: tu_token_secreto"

# Respuesta esperada:
{
  "success": true,
  "message": "Scraper ejecutado exitosamente",
  "result": { ... }
}

# Ver logs en Railway Dashboard → vehicle-backend → Logs
```

✅ **CRON JOB CONFIGURADO**

---

# 📱 PASO 7: Build y Deploy de la App Móvil

### 7.1 Crear cuenta EAS (Expo)

1. Ir a: https://expo.dev
2. Sign up con GitHub
3. Crear nuevo proyecto
4. Conectar a tu repo `vehicle-mgm`

### 7.2 Generar APK para Android

```bash
cd vehicle-app

# Login a Expo
npx eas login

# Build para Android (APK)
npx eas build --platform android --type apk

# Esperar 10-15 minutos mientras compila
# Descargar APK y compartir / instalar en teléfono
```

### 7.3 Generar IPA para iOS (si tienes Mac)

```bash
npx eas build --platform ios --type ipa
```

### 7.4 Distribuir app

**Opción A: Manual (para testing)**
- Descargar APK desde EAS
- Instalar en teléfono Android

**Opción B: Google Play Store (para producción)**
```bash
npx eas submit --platform android --latest
# Requiere cuenta de Google Play Developer ($25 USD)
```

**Opción C: TestFlight (para iOS)**
```bash
npx eas submit --platform ios --latest
# Requiere cuenta de Apple Developer ($99 USD/año)
```

✅ **APP DESPLEGADA**

---

# ✅ PASO 8: Testing End-to-End

Verificar que todo funciona junto:

### 8.1 Test en Desarrollo

```bash
# Terminal 1: Backend local
cd vehicle-backend
npm start

# Terminal 2: Frontend local
cd vehicle-app
npm start

# Abrir en Expo Go y probar
```

### 8.2 Test en Producción

1. **Instalar APK en teléfono** (del paso 7)
2. **Hacer signup**
3. **Permitir notificaciones**
4. **Registrar placa**
5. **Esperar a que cron job corra a las 8 AM**
6. **Verificar que recibe notificación**

### 8.3 Verificar Logs

**Backend logs en Railway:**
```
Dashboard → vehicle-backend → Logs → Ver en tiempo real
```

**Scraper logs:**
```
Buscar: "[CronService]" o "[Python]" en los logs
```

✅ **TODO FUNCIONANDO**

---

# 📋 CHECKLIST FINAL

- [ ] PASO 1: Endpoint /api/scraper/run creado ✅
- [ ] PASO 2: Firebase configurado en app ✅
- [ ] PASO 3: Endpoint /api/auth/update-fcm creado ✅
- [ ] PASO 4: API URL configurada para producción ✅
- [ ] PASO 5: Deploy a Railway completado ✅
- [ ] PASO 5.7: /health endpoint responde ✅
- [ ] PASO 6: Cron-job.org configurado ✅
- [ ] PASO 6.3: Scraper corre manualmente ✅
- [ ] PASO 7: App APK/IPA generado ✅
- [ ] PASO 8: Test end-to-end exitoso ✅
- [ ] Notificación push recibida en teléfono ✅
- [ ] Scraper corre a las 8 AM ✅

---

# 🔗 URLS FINALES

```
API Backend:        https://vehicle-mgm-production.up.railway.app
Supabase DB:        postgresql://postgres:<PASSWORD>@db.vsnqtjqnmbzgoztkmalr.supabase.co
Cron Job Status:    https://cron-job.org (dashboard)
Firebase Console:   https://console.firebase.google.com
Railway Dashboard:  https://railway.app (logs y variables)
```

---

**¿Necesitas ayuda con algún paso?**
