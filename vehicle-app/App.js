import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#18b0b8',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 8
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? '📊' : '📋';
          else if (route.name === 'Vehicle') iconName = focused ? '🚗' : '🚙';
          else if (route.name === 'History') iconName = focused ? '📅' : '📆';
          else if (route.name === 'Notifications') iconName = focused ? '🔔' : '🔕';
          else if (route.name === 'Profile') iconName = focused ? '👤' : '👥';
          else if (route.name === 'Settings') iconName = focused ? '⚙️' : '🔧';
          else if (route.name === 'Help') iconName = focused ? '❓' : '❔';
          
          return <Text style={{ fontSize: 24 }}>{iconName}</Text>;
        }
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Vehicle" component={VehicleScreen} options={{ title: 'Vehículo' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Historial' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notificaciones' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configuración' }} />
      <Tab.Screen name="Help" component={HelpScreen} options={{ title: 'Ayuda' }} />
    </Tab.Navigator>
  );
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
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "MainTabs" : "LoginStack"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen 
          name="LoginStack" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="RegisterStack" 
          component={RegisterScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="MainTabs" 
          component={TabNavigator}
          options={{ headerShown: false }}
        />
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

