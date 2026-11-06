import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { api } from '../services/api';

export default function HistoryScreen() {
  const [allTenencias, setAllTenencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setError(null);
      const res = await api.getAllTenencias();
      if (res.success && res.data?.tenencias) {
        setAllTenencias(res.data.tenencias);
      } else {
        setError(res.message || 'Error al obtener historial de tenencias');
      }
    } catch (err) {
      setError(`Error de red: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#18b0b8" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setLoading(true);
            fetchHistory();
          }}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#18b0b8']} />}
    >
      <Text style={styles.title}>Historial de Tenencias</Text>
      <Text style={styles.subtitle}>{allTenencias.length} años registrados</Text>

      {allTenencias.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Sin historial disponible</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {allTenencias.map((ten, idx) => (
            <View key={idx} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              {idx < allTenencias.length - 1 && (
                <View style={styles.timelineLine} />
              )}
              <View style={styles.timelineCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.yearText}>Año {ten.year}</Text>
                  <View style={[
                    styles.statusBadge,
                    ten.status === 'PAGADO' ? styles.statusPagado : styles.statusPendiente
                  ]}>
                    <Text style={[
                      styles.statusText,
                      ten.status === 'PAGADO' ? styles.statusTextPagado : styles.statusTextPendiente
                    ]}>
                      {ten.status || 'PENDIENTE'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tenencia Base:</Text>
                  <Text style={styles.detailValue}>${Number(ten.tenencia_base || 0).toFixed(2)}</Text>
                </View>

                {ten.subsidio_activo ? (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: '#0e858c' }]}>Subsidio Aplicado:</Text>
                    <Text style={[styles.detailValue, { color: '#0e858c' }]}>-${Number(ten.subsidio_aplicado || 0).toFixed(2)}</Text>
                  </View>
                ) : null}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Refrendo:</Text>
                  <Text style={styles.detailValue}>${Number(ten.refrendo_a_pagar || 0).toFixed(2)}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total a Pagar:</Text>
                  <Text style={styles.totalValue}>${Number(ten.total_a_pagar || 0).toFixed(2)}</Text>
                </View>

                <Text style={styles.dateText}>Límite: {ten.fecha_limite || '31 de marzo'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
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
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f5f9f9',
    padding: 20
  },
  loadingText: { 
    marginTop: 12, 
    color: '#64748b', 
    fontSize: 14 
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  errorText: { 
    fontSize: 15, 
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16
  },
  retryBtn: {
    backgroundColor: '#18b0b8',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  title: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#1e293b', 
    marginBottom: 4,
    marginTop: 12
  },
  subtitle: { 
    fontSize: 13, 
    color: '#64748b', 
    marginBottom: 20 
  },
  empty: { 
    alignItems: 'center', 
    paddingVertical: 40 
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10
  },
  emptyText: { 
    fontSize: 14, 
    color: '#94a3b8' 
  },
  timeline: { 
    marginTop: 20 
  },
  timelineItem: { 
    flexDirection: 'row', 
    marginBottom: 20,
    position: 'relative'
  },
  timelineDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#18b0b8', 
    marginTop: 6, 
    marginRight: 16,
    zIndex: 2
  },
  timelineLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: '#cbd5e1',
    left: 5,
    top: 18
  },
  timelineCard: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 14, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 6, 
    elevation: 2 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  yearText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#1e293b'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusPagado: {
    backgroundColor: '#dcfce7'
  },
  statusPendiente: {
    backgroundColor: '#fef3c7'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  statusTextPagado: {
    color: '#166534'
  },
  statusTextPendiente: {
    color: '#92400e'
  },
  detailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 6 
  },
  detailLabel: { 
    fontSize: 12, 
    color: '#64748b' 
  },
  detailValue: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#1e293b' 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#f1f5f9', 
    marginVertical: 8 
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  totalLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#1e293b' 
  },
  totalValue: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: '#18b0b8' 
  },
  dateText: { 
    fontSize: 11, 
    color: '#94a3b8', 
    marginTop: 6 
  },
});
