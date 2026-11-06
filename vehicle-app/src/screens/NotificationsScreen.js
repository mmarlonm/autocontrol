import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { api } from '../services/api';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
      }
    } catch (e) {
      console.warn('Error obteniendo notificaciones:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchNotifications();
    });
    return unsubscribe;
  }, [navigation, fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: 1 } : n))
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo marcar como leída.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    } catch (e) {
      Alert.alert('Error', 'No se pudo completar la acción.');
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.read;
    const isSubsidio = item.type === 'SUBSIDIO_EXPIRING' || item.type === 'PROMOTION';

    return (
      <View style={[styles.notifCard, isUnread && styles.notifCardUnread]}>
        <View style={styles.notifHeader}>
          <View style={styles.typeTag}>
            <Text style={styles.iconTag}>{isSubsidio ? '🎁' : '⚠️'}</Text>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
          <Text style={styles.dateText}>{item.created_at ? item.created_at.substring(0, 16) : ''}</Text>
        </View>

        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.notifMessage}>{item.message}</Text>

        {isUnread && (
          <TouchableOpacity
            style={styles.markReadBtn}
            onPress={() => handleMarkAsRead(item.id)}
          >
            <Text style={styles.markReadText}>✓ Marcar como leída</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#18b0b8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topActions}>
        <Text style={styles.heading}>Alertas y Notificaciones</Text>
        {notifications.some((n) => !n.read) && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Marcar todas leídas</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Sin Notificaciones</Text>
          <Text style={styles.emptySubtitle}>
            Aquí aparecerán los avisos sobre tus tenencias y subsidios.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#18b0b8']} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f9f9',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18b0b8',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  notifCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  notifCardUnread: {
    borderColor: '#18b0b8',
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#18b0b8',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconTag: {
    fontSize: 14,
    marginRight: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  markReadBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#e6fffa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0e858c',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});

