const { query } = require('../config/database');

const UserModel = {
  create: async (email, passwordHash) => {
    const sql = `
      INSERT INTO users (email, password_hash)
      VALUES (?, ?)
    `;
    const result = await query.run(sql, [email.toLowerCase().trim(), passwordHash]);
    return UserModel.findById(result.lastID);
  },

  findByEmail: async (email) => {
    const sql = `SELECT * FROM users WHERE LOWER(email) = LOWER(?)`;
    return query.get(sql, [email.trim()]);
  },

  findById: async (id) => {
    const sql = `SELECT id, email, fcm_token, created_at, updated_at FROM users WHERE id = ?`;
    return query.get(sql, [id]);
  },

  updateFcmToken: async (userId, token) => {
    const sql = `
      UPDATE users
      SET fcm_token = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await query.run(sql, [token, userId]);
    return UserModel.findById(userId);
  },

  clearInvalidFcmToken: async (invalidToken) => {
    const sql = `
      UPDATE users
      SET fcm_token = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE fcm_token = ?
    `;
    return query.run(sql, [invalidToken]);
  }
};

module.exports = UserModel;
