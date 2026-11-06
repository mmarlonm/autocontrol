import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CDMX_PORTAL_URL = 'https://data.finanzas.cdmx.gob.mx/consulta_adeudos';
const isCdmx = (state) => !state || /CDMX|CIUDAD DE M/i.test(state);

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [allTenencias, setAllTenencias] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Cargar vehículo
      const resVeh = await api.getMyVehicle();
      if (resVeh.success && resVeh.data) {
        setVehicle(resVeh.data.vehicle);
      } else {
        setVehicle(null);
      }

      // 2. Cargar TODAS las tenencias
      try {
        const resTen = await api.getAllTenencias();
        if (!resTen.success) {
          setError(resTen.message || 'Error al obtener tenencias');
          setAllTenencias([]);
        } else if (resTen.data && resTen.data.tenencias) {
          setError(null);
          setAllTenencias(resTen.data.tenencias);
        } else {
          setError(null);
          setAllTenencias([]);
        }
      } catch (err) {
        setError(`Error de red: ${err.message}`);
        setAllTenencias([]);
      }

      // 3. Cargar conteo de notificaciones
      const resNotif = await api.getNotifications();
      if (resNotif.success && resNotif.data) {
        setUnreadCount(resNotif.data.unread_count || 0);
      }
    } catch (err) {
      setError(`Error de conexión: ${err.message}`);
      setVehicle(null);
      setAllTenencias([]);
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
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.unreadIcon}>🔔</Text>
          <Text style={styles.unreadText}>
            Tienes <Text style={{ fontWeight: '800' }}>{unreadCount} alerta(s) nueva(s)</Text> sobre tu vehículo
          </Text>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>
      ) : null}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryBtn}
            onPress={() => {
              setError(null);
              fetchDashboardData();
            }}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : !vehicle ? (
        // Estado vacío: Sin vehículo registrado
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🚘</Text>
          <Text style={styles.emptyTitle}>No tienes un vehículo registrado</Text>
          <Text style={styles.emptySubtitle}>
            Registra tu placa mexicana (ej. ABC-1234) para recibir alertas diarias automáticas de tenencias, subsidios y verificaciones.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Vehicle')}
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

          <View style={styles.syncHeader}>
            <Text style={styles.sectionTitle}>Adeudos Vehiculares</Text>
            {isCdmx(vehicle.state) ? (
              <TouchableOpacity style={styles.syncBtn} onPress={() => Linking.openURL(CDMX_PORTAL_URL)}>
                <Text style={styles.syncBtnText}>Portal oficial</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Mostrar TODAS las tenencias de todos los años */}
          {allTenencias && allTenencias.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Aún no hay adeudos consultados</Text>
              <Text style={styles.emptyDesc}>
                Todavía no tenemos datos oficiales de la placa {vehicle.plate}.
                {isCdmx(vehicle.state) ? ' Puedes consultarlos en el portal de Finanzas CDMX.' : ''}
              </Text>
            </View>
          ) : (
            allTenencias && allTenencias.length > 0 && (
              allTenencias.map((tenencia, idx) => (
                <View key={idx} style={styles.summaryCard}>
                  <View style={styles.yearHeader}>
                    <Text style={styles.yearTitle}>Año {tenencia.year}</Text>
                    <View
                      style={[
                        styles.badge,
                        tenencia.status === 'PAGADO' ? styles.badgeSuccess : styles.badgePending
                      ]}
                    >
                      <Text style={styles.badgeLabel}>
                        {tenencia.status || 'PENDIENTE DE PAGO'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Tenencia Vehicular:</Text>
                    <Text style={styles.rowValue}>
                      ${Number(tenencia.tenencia_base ?? 0).toFixed(2)} MXN
                    </Text>
                  </View>

                  {tenencia.subsidio_activo ? (
                    <View style={styles.row}>
                      <Text style={[styles.rowLabel, { color: '#0e858c', fontWeight: '700' }]}>
                        Subsidio Aplicado (100%):
                      </Text>
                      <Text style={[styles.rowValue, { color: '#0e858c', fontWeight: '700' }]}>
                        -${Number(tenencia.subsidio_aplicado ?? 0).toFixed(2)} MXN
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Derecho Anual de Refrendo:</Text>
                    <Text style={styles.rowValue}>
                      ${Number(tenencia.refrendo_a_pagar ?? 0).toFixed(2)} MXN
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total a Pagar:</Text>
                    <Text style={styles.totalAmount}>
                      ${Number(tenencia.total_a_pagar ?? 0).toFixed(2)} MXN
                    </Text>
                  </View>

                  <Text style={styles.dueDateText}>Fecha Límite: {tenencia.fecha_limite || '31 de marzo'}</Text>
                </View>
              ))
            )
          )}
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
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  yearTitle: {
    fontSize: 16,
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
  noDataText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f9f9',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: '#18b0b8',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
