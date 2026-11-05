const { query } = require('../config/database');

const NotificationModel = {
  create: async ({ userId, type, title, message, createdAt = null }) => {
    // Si createdAt no es provisto, usar la fecha y hora actual en formato YYYY-MM-DD HH:MM:SS
    const nowStr = createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19);

    const sql = `
      INSERT INTO notifications (user_id, type, title, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    try {
      const res = await query.run(sql, [userId, type, title, message, nowStr]);
      return { id: res.lastID, userId, type, title, message, read: 0, created_at: nowStr };
    } catch (err) {
      // Si viola la restriccion UNIQUE de (user_id, type, created_at), SQLite lanza SQLITE_CONSTRAINT
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        console.warn(`[NotificationModel] Notificación duplicada prevenida para usuario ${userId}, tipo ${type}, timestamp ${nowStr}`);
        return null;
      }
      throw err;
    }
  },

  getByUserId: async (userId, limit = 50) => {
    const sql = `
      SELECT id, user_id, type, title, message, read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `;
    return query.all(sql, [userId, limit]);
  },

  markAsRead: async (id, userId) => {
    const sql = `
      UPDATE notifications
      SET read = 1
      WHERE id = ? AND user_id = ?
    `;
    const res = await query.run(sql, [id, userId]);
    return res.changes > 0;
  },

  markAllAsRead: async (userId) => {
    const sql = `
      UPDATE notifications
      SET read = 1
      WHERE user_id = ?
    `;
    return query.run(sql, [userId]);
  },

  getUnreadCount: async (userId) => {
    const sql = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = ? AND read = 0
    `;
    const row = await query.get(sql, [userId]);
    return row ? row.unread_count : 0;
  }
};

module.exports = NotificationModel;
