import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Switch
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', onPress: () => {} },
        { 
          text: 'Cerrar Sesión',
          onPress: logout,
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configuración</Text>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Notificaciones Push</Text>
            <Switch 
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#cbd5e1', true: '#18b0b8' }}
              thumbColor={notifications ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acerca de</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.cardRow} onPress={() => Linking.openURL('https://autocontrol-mexico.com/privacy')}>
            <Text style={styles.link}>Política de Privacidad</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.cardRow} onPress={() => Linking.openURL('https://autocontrol-mexico.com/terms')}>
            <Text style={styles.link}>Términos de Servicio</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.cardRow}>
            <Text style={styles.label}>Versión:</Text>
            <Text style={styles.value}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f9f9' 
  },
  content: { 
    padding: 20, 
    paddingBottom: 40 
  },
  header: { 
    marginBottom: 24, 
    marginTop: 12 
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1e293b' 
  },
  section: { 
    marginBottom: 20 
  },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#64748b', 
    marginBottom: 12, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  cardRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12 
  },
  switchRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  label: { 
    fontSize: 14, 
    color: '#334155', 
    fontWeight: '600' 
  },
  value: { 
    fontSize: 14, 
    color: '#1e293b', 
    fontWeight: '600' 
  },
  link: { 
    fontSize: 14, 
    color: '#18b0b8', 
    fontWeight: '600' 
  },
  arrow: { 
    fontSize: 16, 
    color: '#18b0b8' 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#f1f5f9', 
    marginVertical: 8 
  },
  logoutBtn: { 
    backgroundColor: '#fecaca', 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 30 
  },
  logoutText: { 
    color: '#991b1b', 
    fontSize: 16, 
    fontWeight: '700' 
  },
});
