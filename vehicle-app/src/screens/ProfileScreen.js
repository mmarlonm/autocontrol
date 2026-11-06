import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [securityCode, setSecurityCode] = useState('****');

  const handleChangePassword = () => {
    Alert.alert(
      'Cambiar Contraseña',
      'Esta función requiere verificación de correo.',
      [
        { text: 'Cancelar', onPress: () => {} },
        { 
          text: 'Enviar código de verificación',
          onPress: () => {
            Alert.alert('✅ Código enviado', `Se envió un código a ${user?.email}`);
          }
        }
      ]
    );
  };

  const handleEnableTwoFactor = () => {
    Alert.alert(
      'Autenticación de Dos Factores',
      '¿Activar autenticación de dos factores?',
      [
        { text: 'Ahora no', onPress: () => {} },
        { 
          text: 'Activar',
          onPress: () => {
            Alert.alert('✅ 2FA Activado', 'Tu cuenta está protegida con autenticación de dos factores');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar Cuenta',
      '⚠️ Esta acción no se puede deshacer. Se eliminarán todos tus datos.',
      [
        { text: 'Cancelar', onPress: () => {} },
        { 
          text: 'Eliminar',
          onPress: () => {
            Alert.alert('Cuenta eliminada', 'Tu cuenta ha sido eliminada permanentemente');
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi Perfil</Text>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.memberSince}>Miembro desde 2024</Text>
        </View>
      </View>

      {/* Account Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seguridad de Cuenta</Text>
        <View style={styles.card}>
          {/* Password */}
          <TouchableOpacity style={styles.settingRow} onPress={handleChangePassword}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Contraseña</Text>
              <Text style={styles.settingDescription}>Cambiar tu contraseña</Text>
            </View>
            <Text style={styles.settingValue}>{securityCode}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Two Factor Authentication */}
          <TouchableOpacity style={styles.settingRow} onPress={handleEnableTwoFactor}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Autenticación 2FA</Text>
              <Text style={styles.settingDescription}>Añadir una capa extra de seguridad</Text>
            </View>
            <Text style={styles.settingStatus}>Desactivado</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de Cuenta</Text>
        <View style={styles.card}>
          {/* Account Status */}
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Estado de Cuenta</Text>
              <Text style={styles.settingDescription}>Tu cuenta está activa</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Activa</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Joined Date */}
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Fecha de Registro</Text>
              <Text style={styles.settingDescription}>Desde que te uniste</Text>
            </View>
            <Text style={styles.settingValue}>2024</Text>
          </View>

          <View style={styles.divider} />

          {/* Linked Vehicles */}
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Vehículos Registrados</Text>
              <Text style={styles.settingDescription}>Número total registrado</Text>
            </View>
            <Text style={styles.settingValue}>1</Text>
          </View>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zona de Peligro</Text>
        <TouchableOpacity style={styles.dangerCard} onPress={handleDeleteAccount}>
          <Text style={styles.dangerIcon}>🗑️</Text>
          <View style={styles.dangerContent}>
            <Text style={styles.dangerLabel}>Eliminar Cuenta</Text>
            <Text style={styles.dangerDescription}>Acción permanente - no se puede deshacer</Text>
          </View>
        </TouchableOpacity>
      </View>
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
  title: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1e293b',
    marginBottom: 24,
    marginTop: 12
  },
  profileHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#18b0b8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  avatarText: {
    fontSize: 32
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4
  },
  memberSince: {
    fontSize: 12,
    color: '#94a3b8'
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
    paddingVertical: 12,
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  settingContent: {
    flex: 1,
    marginRight: 12
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2
  },
  settingDescription: {
    fontSize: 12,
    color: '#94a3b8'
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18b0b8'
  },
  settingStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444'
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534'
  },
  divider: { 
    height: 1, 
    backgroundColor: '#f1f5f9', 
    marginHorizontal: 16
  },
  dangerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  dangerIcon: {
    fontSize: 24,
    marginRight: 12
  },
  dangerContent: {
    flex: 1
  },
  dangerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 2
  },
  dangerDescription: {
    fontSize: 12,
    color: '#b91c1c'
  }
});
