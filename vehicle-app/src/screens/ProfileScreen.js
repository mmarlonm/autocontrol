import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const formatMemberSince = (iso) => {
  const date = iso ? new Date(iso) : null;
  return date && !isNaN(date) ? date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) : null;
};

function MenuRow({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#18b0b8" />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const memberSince = formatMemberSince(user?.created_at);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi Perfil</Text>

      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color="#ffffff" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {memberSince ? <Text style={styles.memberSince}>Miembro desde {memberSince}</Text> : null}
        </View>
      </View>

      <View style={styles.card}>
        <MenuRow icon="settings-outline" label="Configuración" onPress={() => navigation.navigate('Settings')} />
        <View style={styles.divider} />
        <MenuRow icon="help-circle-outline" label="Ayuda y preguntas frecuentes" onPress={() => navigation.navigate('Help')} />
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b'
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16
  }
});
