import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { API_BASE_URL } from './api';

export async function requestFCMToken() {
  try {
    // 1. Solicitar permiso (requestPermission)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[FCM] Permiso de notificaciones denegado o no otorgado.');
      return null;
    }

    // 2. Si autorizado, obtener token (getToken())
    const token = await messaging().getToken();
    console.log('[FCM] Token obtenido:', token);

    if (token) {
      // 3. Guardar en AsyncStorage con key 'fcm_token'
      await AsyncStorage.setItem('fcm_token', token);

      // 4. Si usuario está logueado, enviar al backend:
      //    POST /api/auth/fcm-token
      //    Body: { fcm_token: token }
      //    Headers: Authorization: Bearer {jwt_token_de_asyncstorage}
      const jwtToken =
        (await AsyncStorage.getItem('@autocontrol_jwt_token')) ||
        (await AsyncStorage.getItem('jwt_token')) ||
        (await AsyncStorage.getItem('token'));

      if (jwtToken) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/fcm-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ fcm_token: token })
          });
          const resData = await response.json();
          console.log('[FCM] Sincronización con backend exitosa:', resData);
        } catch (apiError) {
          console.warn('[FCM] Error sincronizando token con backend:', apiError.message);
        }
      }
    }

    // 5. Retornar el token
    return token;
  } catch (error) {
    console.warn('[FCM] Error al solicitar o sincronizar token FCM:', error.message);
    return null;
  }
}

export function setupNotificationListeners() {
  // Configurar listener para mensajes en foreground
  // messaging().onMessage(async (remoteMessage) => { ... })
  // Mostrar contenido de remoteMessage
  try {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('[FCM Foreground] Mensaje recibido:', remoteMessage);

      if (remoteMessage?.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'Nueva Notificación',
          remoteMessage.notification.body || ''
        );
      }
    });

    return unsubscribe;
  } catch (error) {
    console.warn('[FCM] Error al configurar onMessage listener:', error.message);
    return () => {};
  }
}

export function setupBackgroundHandler() {
  // Configurar listener para cuando app está en background
  // messaging().onNotificationOpenedApp(async (remoteMessage) => { ... })
  try {
    const unsubscribe = messaging().onNotificationOpenedApp(async (remoteMessage) => {
      console.log('[FCM Background] App abierta desde notificación en background:', remoteMessage);
    });

    // Verificar si la aplicación se abrió desde un estado cerrado (Quit/Killed state)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('[FCM Quit] App abierta desde estado cerrado por notificación:', remoteMessage);
        }
      })
      .catch((err) => {
        console.warn('[FCM] Error al verificar initialNotification:', err.message);
      });

    return unsubscribe;
  } catch (error) {
    console.warn('[FCM] Error al configurar background handler:', error.message);
    return () => {};
  }
}
