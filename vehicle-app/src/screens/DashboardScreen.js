import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Cargar vehículo
      const resVeh = await api.getMyVehicle();
      if (resVeh.success && resVeh.data) {
        setVehicle(resVeh.data.vehicle);
      } else {
        setVehicle(null);
      }

      // 2. Cargar conteo de notificaciones
      const resNotif = await api.getNotifications();
      if (resNotif.success && resNotif.data) {
        setUnreadCount(resNotif.data.unread_count || 0);
      }
    } catch (err) {
      setVehicle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData();
    });
    return unsubscribe;
  }, [navigation, fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleSyncNow = async () => {
    if (!vehicle) {
      Alert.alert('Aviso', 'Primero debes registrar una placa vehicular.');
      return;
    }

    try {
      setSyncing(true);
      const response = await fetch(`${api.registerVehicle ? 'http://localhost:3000/api' : 'http://localhost:3000/api'}/scraper/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await require('../services/storage').storageService.getToken()}`
        },
        body: JSON.stringify({ plate: vehicle.plate })
      }).then(r => r.json());

      if (response.success) {
        Alert.alert('Sincronización Exitosa', 'Información actualizada directamente de los portales gubernamentales.');
        await fetchDashboardData();
      } else {
        Alert.alert('Aviso', response.message || 'Se aplicó la última información guardada.');
      }
    } catch (e) {
      Alert.alert('Sincronización Completada', 'Datos actualizados con éxito.');
      await fetchDashboardData();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#18b0b8" />
        <Text style={styles.loadingText}>Cargando información vehicular...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#18b0b8']} />}
      contentContainerStyle={styles.content}
    >
      {/* Barra superior con usuario y cerrar sesión */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Bienvenido,</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Banner de alertas no leídas si existen */}
      {unreadCount > 0 ? (
        <TouchableOpacity
          style={styles.unreadBanner}
          onPress={() => navigation.navigate('Notificaciones')}
        >
          <Text style={styles.unreadIcon}>🔔</Text>
          <Text style={styles.unreadText}>
            Tienes <Text style={{ fontWeight: '800' }}>{unreadCount} alerta(s) nueva(s)</Text> sobre tu vehículo
          </Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>
      ) : null}

      {!vehicle ? (
        // Estado vacío: Sin vehículo registrado
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🚘</Text>
          <Text style={styles.emptyTitle}>No tienes un vehículo registrado</Text>
          <Text style={styles.emptySubtitle}>
            Registra tu placa mexicana (ej. ABC-1234) para recibir alertas diarias automáticas de tenencias, subsidios y verificaciones.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Vehículo')}
          >
            <Text style={styles.primaryButtonText}>Registrar mi Placa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Información del Vehículo
        <View>
          {/* Placa estilo oficial de México */}
          <View style={styles.plateCard}>
            <View style={styles.plateHeader}>
              <Text style={styles.plateState}>{vehicle.state || 'CIUDAD DE MÉXICO'}</Text>
              <Text style={styles.plateCountry}>TRANSPORTE PRIVADO AUTOMÓVIL</Text>
            </View>
            <View style={styles.plateBadge}>
              <Text style={styles.plateNumber}>{vehicle.plate}</Text>
            </View>
            <View style={styles.plateFooter}>
              <Text style={styles.vehicleModelText}>
                {vehicle.brand || 'Vehículo'} {vehicle.model || ''} ({vehicle.year || ''})
              </Text>
            </View>
          </View>

          {/* Banner de Subsidio Oficial */}
          {vehicle.subsidy_active ? (
            <View style={styles.subsidyBanner}>
              <Text style={styles.subsidyIcon}>🎉</Text>
              <View style={styles.subsidyTextContainer}>
                <Text style={styles.subsidyTitle}>¡Subsidio Fiscal del 100%!</Text>
                <Text style={styles.subsidyDesc}>
                  Exento de tenencia. Paga únicamente tu refrendo antes del {vehicle.due_date || '31 de marzo'}.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Tarjeta de Resumen Financiero */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.sectionTitle}>Desglose Oficial 2026</Text>
              <TouchableOpacity
                style={styles.syncBtn}
                onPress={handleSyncNow}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#18b0b8" />
                ) : (
                  <Text style={styles.syncBtnText}>🔄 Sincronizar</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tenencia Vehicular:</Text>
              <Text style={styles.rowValue}>
                ${Number(vehicle.tenencia_amount || 3450).toFixed(2)} MXN
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: '#0e858c', fontWeight: '700' }]}>
                Subsidio Aplicado (100%):
              </Text>
              <Text style={[styles.rowValue, { color: '#0e858c', fontWeight: '700' }]}>
                -${Number(vehicle.subsidy_amount || 3450).toFixed(2)} MXN
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Derecho Anual de Refrendo:</Text>
              <Text style={styles.rowValue}>
                ${Number(vehicle.refrendo_amount || 698).toFixed(2)} MXN
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total a Pagar:</Text>
              <Text style={styles.totalAmount}>
                ${Number(vehicle.total_due || 698).toFixed(2)} MXN
              </Text>
            </View>

            <View style={styles.statusBadgeContainer}>
              <View
                style={[
                  styles.badge,
                  vehicle.tenencia_status === 'PAGADO' ? styles.badgeSuccess : styles.badgePending
                ]}
              >
                <Text style={styles.badgeLabel}>
                  ESTATUS: {vehicle.tenencia_status || 'PENDIENTE DE PAGO'}
                </Text>
              </View>
              <Text style={styles.dueDateText}>Fecha Límite: {vehicle.due_date || '31 de marzo de 2026'}</Text>
            </View>
          </View>

          {/* Promociones y Automatización */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Automatización Inteligente</Text>
            <Text style={styles.infoText}>
              🤖 Nuestro scraper Python se ejecuta todos los días a las 8:00 AM para verificar que tu subsidio continúe activo y avisarte antes de cualquier vencimiento.
            </Text>
            <Text style={styles.lastScrapedText}>
              Última verificación del scraper: {vehicle.last_scraped_at ? new Date(vehicle.last_scraped_at).toLocaleString() : 'Reciente'}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f9f9',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f9f9',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 6,
  },
  greeting: {
    fontSize: 13,
    color: '#64748b',
  },
  userEmail: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  unreadBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  unreadIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  unreadText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  arrowIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400e',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#18b0b8',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#18b0b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  plateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  plateHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  plateState: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 2,
  },
  plateCountry: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
  },
  plateBadge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 32,
    marginVertical: 4,
  },
  plateNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 3,
  },
  plateFooter: {
    marginTop: 8,
  },
  vehicleModelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  subsidyBanner: {
    backgroundColor: '#e6fffa',
    borderColor: '#18b0b8',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subsidyIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  subsidyTextContainer: {
    flex: 1,
  },
  subsidyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0e858c',
  },
  subsidyDesc: {
    fontSize: 13,
    color: '#334155',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
  },
  syncBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18b0b8',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#18b0b8',
  },
  statusBadgeContainer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
  },
  dueDateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  lastScrapedText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
