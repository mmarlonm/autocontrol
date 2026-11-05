import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import { storageService } from '../services/storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      setLoading(true);
      const savedToken = await storageService.getToken();
      const savedUser = await storageService.getUser();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
      }
    } catch (e) {
      console.error('Error restaurando sesión:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.login(email, password, fcmToken);
    if (response.success && response.data) {
      const { user: userData, token: userToken } = response.data;
      setUser(userData);
      setToken(userToken);
      await storageService.saveToken(userToken);
      await storageService.saveUser(userData);
      return userData;
    }
    throw new Error(response.message || 'Error al iniciar sesión');
  };

  const register = async (email, password) => {
    const response = await api.register(email, password, fcmToken);
    if (response.success && response.data) {
      const { user: userData, token: userToken } = response.data;
      setUser(userData);
      setToken(userToken);
      await storageService.saveToken(userToken);
      await storageService.saveUser(userData);
      return userData;
    }
    throw new Error(response.message || 'Error en el registro');
  };

  const logout = async () => {
    try {
      await storageService.clearAll();
      setUser(null);
      setToken(null);
    } catch (e) {
      console.error('Error cerrando sesión:', e);
    }
  };

  const updatePushToken = async (newToken) => {
    setFcmToken(newToken);
    if (token) {
      try {
        await api.updateFcmToken(newToken);
      } catch (e) {
        console.warn('No se pudo sincronizar token FCM con el servidor:', e.message);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        updatePushToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

