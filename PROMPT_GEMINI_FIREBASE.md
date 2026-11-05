# PROMPT PARA GEMINI - Implementar Firebase Notifications

## CONTEXTO DEL PROYECTO

**Proyecto:** Vehicle Management App (Gestión de Tenencias Vehiculares México)
- Backend: Node.js/Express + PostgreSQL (Supabase)
- Frontend: React Native + Expo
- Notificaciones: Firebase Cloud Messaging (FCM)

**Estado actual:**
- ✅ Backend completamente funcional
- ✅ API endpoints listos
- ⚠️ Frontend necesita Firebase para recibir push notifications

**Qué falta:**
1. Configurar Firebase en app.json
2. Crear notificationHandler.js
3. Actualizar API URL para producción
4. Integrar handlers en App.js

---

## TAREA ESPECÍFICA PARA GEMINI

### PASO 1: Actualizar app.json

**Archivo:** `vehicle-app/app.json`

Agregar la sección de plugins de Firebase:

```json
{
  "expo": {
    "name": "AutoControl",
    "slug": "autocontrol-mexico",
    "version": "1.0.0",
    "assetBundlePatterns": ["**/*"],
    "plugins": [
      [
        "react-native-firebase/app"
      ],
      [
        "react-native-firebase/messaging",
        {
          "icon": "path/to/your/notification-icon"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "tu-eas-project-id"
      }
    }
  }
}
```

---

### PASO 2: Crear notificationHandler.js

**Archivo:** `vehicle-app/src/services/notificationHandler.js`

Crear un archivo con estas funciones:

```javascript
/**
 * Manejo de Push Notifications con Firebase Cloud Messaging
 * - Solicita permisos al usuario
 * - Obtiene token FCM
 * - Configura listeners para mensajes en foreground
 * - Sincroniza token con backend
 */

// Importaciones necesarias:
// - react-native-firebase/messaging
// - @react-native-async-storage/async-storage
// - fetch API (built-in)

// Función principal: requestFCMToken()
// - Solicita permiso al usuario
// - Obtiene el token FCM del dispositivo
// - Lo guarda en AsyncStorage con key: 'fcm_token'
// - Lo retorna

// Función: saveFCMTokenToBackend(token)
// - Recibe un token FCM
// - Obtiene el JWT token de AsyncStorage (key: 'jwt_token')
// - Hace POST a: /api/auth/fcm-token
// - Body: { fcm_token: token }
// - Headers: Authorization: Bearer {jwt_token}

// Función: setupNotificationListeners()
// - Configura listener para mensajes cuando app está en foreground
// - Maneja mensajes del tipo: { notification: { title, body }, data: { ... } }
// - Muestra notificación (usando Alert o custom)
// - Guarda en AsyncStorage con key: 'last_notification'

// Función: setupBackgroundHandler()
// - Configura listener para cuando app está en background
// - Ejecuta lógica cuando usuario toca la notificación

// Exportar:
// - requestFCMToken (async)
// - setupNotificationListeners (sync)
// - setupBackgroundHandler (sync)
```

---

### PASO 3: Actualizar API URL

**Archivo:** `vehicle-app/src/services/api.js` (línea 1-7)

Cambiar la definición de API_BASE_URL:

```javascript
// ACTUAL (solo localhost):
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const API_BASE_URL = `${DEFAULT_HOST}/api`;

// CAMBIAR A (soporta ambos):
const DEV = __DEV__; // true en desarrollo, false en producción

const DEFAULT_HOST = DEV
  ? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
  : 'https://vehicle-mgm-production.up.railway.app';

export const API_BASE_URL = `${DEFAULT_HOST}/api`;
```

---

### PASO 4: Integrar en App.js

**Archivo:** `vehicle-app/App.js`

En la función `RootNavigator()`, agregar:

```javascript
// En los imports de arriba:
// import { requestFCMToken, setupNotificationListeners, setupBackgroundHandler } from './src/services/notificationHandler';

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  // Configurar Firebase cuando se carga la app
  useEffect(() => {
    // Setup notification handlers
    setupBackgroundHandler();
    
    // Si el usuario está autenticado, obtener FCM token
    if (isAuthenticated) {
      requestFCMToken();
      setupNotificationListeners();
    }
  }, [isAuthenticated]);

  // ... resto del código
}
```

---

## DETALLES TÉCNICOS

### Flujo de FCM Token:
1. Usuario abre app → solicita permiso de notificaciones
2. Sistema obtiene token FCM del dispositivo
3. Guarda localmente en AsyncStorage
4. Envía al backend via POST /api/auth/fcm-token
5. Backend guarda en tabla users.fcm_token
6. Cuando scraper envía notificación, usa este token

### Formato de Mensaje FCM:
```json
{
  "notification": {
    "title": "¡Subsidio Activo 100%!",
    "body": "Tu tenencia tiene subsidio. Paga solo refrendo."
  },
  "data": {
    "type": "TENENCIA_UPDATE",
    "plate": "ABC-1234",
    "total_due": "698.00"
  }
}
```

### Permisos Android (automáticos con react-native-firebase):
- android.permission.POST_NOTIFICATIONS
- android.permission.RECEIVE_BOOT_COMPLETED

### Testing:
```bash
# En el backend, enviar notificación de prueba:
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {tu_jwt_token}" \
  -d '{"userId":1,"title":"Test","body":"Esto es una prueba"}'
```

---

## REQUISITOS PREVIOS (YA ESTÁN HECHOS)

✅ react-native-firebase instalado
✅ Firebase Service Account JSON en: vehicle-backend/src/config/firebase-service-account.json
✅ Backend endpoint: POST /api/auth/fcm-token (LISTO)
✅ Backend endpoint: POST /api/notifications/test (LISTO)
✅ AsyncStorage ya está instalado y funcionando

---

## ARCHIVOS QUE GEMINI DEBE CREAR/MODIFICAR

1. **MODIFICAR:** `vehicle-app/app.json`
   - Agregar sección `plugins` de Firebase

2. **CREAR:** `vehicle-app/src/services/notificationHandler.js`
   - Todas las funciones de manejo de FCM

3. **MODIFICAR:** `vehicle-app/src/services/api.js`
   - Línea 1-7: Cambiar definición de API_BASE_URL

4. **MODIFICAR:** `vehicle-app/App.js`
   - Agregar imports de notificationHandler
   - Agregar useEffect en RootNavigator

---

## VALIDACIONES QUE DEBE HACER GEMINI

✅ Verificar que react-native-firebase está importado correctamente
✅ Usar AsyncStorage para guardar/obtener tokens
✅ Manejo de errores en requestPermission()
✅ Listeners para foreground y background
✅ POST a /api/auth/fcm-token cuando obtiene token nuevo
✅ URL de API cambia según __DEV__

---

## COMMITS QUE DEBE HACER

```bash
git add vehicle-app/app.json \
        vehicle-app/src/services/notificationHandler.js \
        vehicle-app/src/services/api.js \
        vehicle-app/App.js

git commit -m "feat: implement Firebase Cloud Messaging for push notifications"
git push origin main
```

---

## DESPUÉS DE ESTO

Una vez Gemini termina:

1. Las variables en App.js automáticamente
2. La app solicitará permisos de notificación al abrir
3. El token FCM se sincronizará con el backend
4. El usuario puede recibir push notifications del scraper

Siguiente paso: Deploy a Railway.app

---

## INSTRUCCIONES FINALES PARA GEMINI

```
IMPLEMENTA EXACTAMENTE ESTO:

1. Lee este documento completamente
2. Implementa los 4 pasos en orden
3. Verifica que el código sea funcional (sin errores)
4. Haz los commits especificados
5. NO cambies nada más
6. Responde cuando termines
```
