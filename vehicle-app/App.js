import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { requestFCMToken, setupNotificationListeners, setupBackgroundHandler } from './src/services/notificationHandler';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import VehicleScreen from './src/screens/VehicleScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HelpScreen from './src/screens/HelpScreen';

// Configurar comportamiento de notificaciones locales / push en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TABS = {
  Dashboard: { title: 'Inicio', icon: 'home' },
  Vehicle: { title: 'Vehículo', icon: 'car' },
  History: { title: 'Historial', icon: 'time' },
  Notifications: { title: 'Alertas', icon: 'notifications' },
  Profile: { title: 'Perfil', icon: 'person' },
};

const TabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        title: TABS[route.name].title,
        tabBarActiveTintColor: '#18b0b8',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarHideOnKeyboard: true,
        // Barra flotante: píldora con márgenes sobre el fondo de la app
        tabBarStyle: {
          height: 64,
          marginHorizontal: 16,
          marginBottom: Math.max(insets.bottom, 12),
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 24,
          borderTopWidth: 0,
          backgroundColor: '#ffffff',
          elevation: 10,
          shadowColor: '#0f172a',
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const { icon } = TABS[route.name];
          return <Ionicons name={focused ? icon : `${icon}-outline`} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Vehicle" component={VehicleScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#f5f9f9' },
};

// Settings y Help traen su propio título en pantalla; el header solo aporta el botón de regreso
const subScreenOptions = {
  headerShown: true,
  title: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#f5f9f9' },
  headerTintColor: '#18b0b8',
};

function RootNavigator() {
  const { isAuthenticated, loading, updatePushToken } = useAuth();

  useEffect(() => {
    // 1. Configurar listener para cuando app está en background
    setupBackgroundHandler();

    // 2. Si el usuario está autenticado, solicitar token FCM y configurar listeners
    if (isAuthenticated) {
      requestFCMToken().then((token) => {
        if (token) {
          updatePushToken(token);
        }
      });

      const unsubscribe = setupNotificationListeners();
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [isAuthenticated, updatePushToken]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#18b0b8" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={subScreenOptions} />
            <Stack.Screen name="Help" component={HelpScreen} options={subScreenOptions} />
          </>
        ) : (
          <>
            <Stack.Screen name="LoginStack" component={LoginScreen} />
            <Stack.Screen name="RegisterStack" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

/**
 * Registro de notificaciones Push (FCM / Expo)
 * Consumo de batería BAJO: El teléfono solo recibe notificaciones, no ejecuta scraper.
 */
async function registerForPushNotificationsAsync() {
  let token = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'AutoControl Alertas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#18b0b8',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus === 'granted') {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        token = tokenData.data;
      } catch (err) {
        console.log('Error obteniendo token push real:', err.message);
        // Fallback simulado para entorno dev / sandbox
        token = `fcm_device_token_${Date.now()}`;
      }
    }
  } else {
    // Simulador o navegador web
    token = `simulated_fcm_token_${Date.now()}`;
  }

  return token;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f9f9',
  },
});

