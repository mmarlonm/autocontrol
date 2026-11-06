const { admin, collections, db } = require('../config/database');

const NotificationModel = {
  create: async ({ userId, type, title, message, createdAt = null }) => {
    // Si createdAt no es provisto, usar la fecha y hora actual en formato YYYY-MM-DD HH:MM:SS
    const nowStr = createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Prevención de duplicados (Restricción UNIQUE en (user_id, type, created_at))
    const safeTimeKey = nowStr.replace(/[^a-zA-Z0-9]/g, '_');
    const notifDocId = `${userId}_${type}_${safeTimeKey}`;
    const docRef = collections.notifications.doc(notifDocId);

    try {
      const existing = await docRef.get();
      if (existing.exists) {
        console.warn(`[NotificationModel] Notificación duplicada prevenida para usuario ${userId}, tipo ${type}, timestamp ${nowStr}`);
        return null;
      }

      await docRef.set({
        user_id: String(userId),
        type,
        title,
        message,
        read: 0,
        created_at: nowStr,
        server_created_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        id: notifDocId,
        userId,
        type,
        title,
        message,
        read: 0,
        created_at: nowStr
      };
    } catch (err) {
      console.error('[NotificationModel.create] Error al guardar notificación:', err.message);
      throw err;
    }
  },

  getByUserId: async (userId, limit = 50) => {
    if (!userId) return [];

    try {
      const snapshot = await collections.notifications
        .where('user_id', '==', String(userId))
        .get();

      if (snapshot.empty) {
        return [];
      }

      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });

      // Ordenar en memoria de forma descendente por fecha para evitar requerir índices compuestos en Firebase
      notifications.sort((a, b) => {
        const dateA = a.created_at || '';
        const dateB = b.created_at || '';
        return dateB.localeCompare(dateA);
      });

      return notifications.slice(0, limit);
    } catch (err) {
      console.error('[NotificationModel.getByUserId] Error:', err.message);
      return [];
    }
  },

  markAsRead: async (id, userId) => {
    if (!id) return false;

    try {
      const docRef = collections.notifications.doc(String(id));
      const doc = await docRef.get();

      if (!doc.exists) {
        return false;
      }

      const data = doc.data();
      if (String(data.user_id) !== String(userId)) {
        return false;
      }

      await docRef.update({
        read: 1,
        updated_at: new Date().toISOString(),
        server_updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (err) {
      console.error('[NotificationModel.markAsRead] Error:', err.message);
      return false;
    }
  },

  markAllAsRead: async (userId) => {
    if (!userId) return { changes: 0 };

    try {
      const snapshot = await collections.notifications
        .where('user_id', '==', String(userId))
        .where('read', '==', 0)
        .get();

      if (snapshot.empty) {
        return { changes: 0 };
      }

      const batch = db.batch();
      const nowIso = new Date().toISOString();

      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          read: 1,
          updated_at: nowIso,
          server_updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      return { changes: snapshot.size };
    } catch (err) {
      console.error('[NotificationModel.markAllAsRead] Error:', err.message);
      return { changes: 0 };
    }
  },

  getUnreadCount: async (userId) => {
    if (!userId) return 0;

    try {
      const snapshot = await collections.notifications
        .where('user_id', '==', String(userId))
        .where('read', '==', 0)
        .get();

      return snapshot.size;
    } catch (err) {
      console.error('[NotificationModel.getUnreadCount] Error:', err.message);
      return 0;
    }
  }
};

module.exports = NotificationModel;
