import { Platform } from 'react-native';
import { storageService } from './storage';

// En emulador Android 10.0.2.2 apunta al localhost de la máquina host.
// En iOS / Web localhost funciona directamente.
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const API_BASE_URL = `${DEFAULT_HOST}/api`;

const request = async (endpoint, options = {}) => {
  const token = await storageService.getToken();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        await storageService.clearAll();
      }
      throw new Error(data.message || `Error en la solicitud: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.warn(`[API] Error solicitando ${endpoint}:`, error.message);
    throw error;
  }
};

export const api = {
  // Auth
  register: (email, password, fcm_token) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fcm_token })
    }),

  login: (email, password, fcm_token) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, fcm_token })
    }),

  getProfile: () => request('/auth/profile'),

  updateFcmToken: (fcm_token) =>
    request('/auth/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ fcm_token })
    }),

  // Vehículo
  getMyVehicle: () => request('/vehicles'),

  getVehicleStatus: () => request('/vehicles/status'),

  registerVehicle: (vehicleData) =>
    request('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData)
    }),

  updateVehicle: (vehicleData) =>
    request('/vehicles', {
      method: 'PUT',
      body: JSON.stringify(vehicleData)
    }),

  // Notificaciones
  getNotifications: () => request('/notifications'),

  markNotificationAsRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PUT'
    }),

  markAllNotificationsAsRead: () =>
    request('/notifications/read-all', {
      method: 'PUT'
    })
};
