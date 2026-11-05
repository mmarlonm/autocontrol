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
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import VehicleScreen from './src/screens/VehicleScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

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

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        },
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          color: '#0f172a',
        },
        tabBarActiveTintColor: '#18b0b8',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={DashboardScreen}
        options={{
          headerTitle: 'AutoControl México',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Vehículo"
        component={VehicleScreen}
        options={{
          headerTitle: 'Gestión de Placa',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🚗</Text>,
        }}
      />
      <Tab.Screen
        name="Notificaciones"
        component={NotificationsScreen}
        options={{
          headerTitle: 'Mis Alertas',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔔</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, loading, updatePushToken } = useAuth();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        updatePushToken(token);
      }
    });
  }, [updatePushToken]);

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
      {isAuthenticated ? (
        <AppTabs />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
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
