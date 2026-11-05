const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/vehicles.sqlite');
const dbDir = path.dirname(path.resolve(dbPath));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(path.resolve(dbPath), (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log(`Conectado a la base de datos SQLite en: ${dbPath}`);
  }
});

// Habilitar claves foraneas en SQLite
db.run('PRAGMA foreign_keys = ON;');

/**
 * Promisified database helpers
 */
const query = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },

  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  exec: (sql) => {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

/**
 * Inicializar tablas
 */
const initDatabase = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      fcm_token TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      plate TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'CDMX',
      brand TEXT,
      model TEXT,
      year INTEGER,
      serial_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vehicle_tenencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      tenencia_amount REAL NOT NULL DEFAULT 0.0,
      subsidy_amount REAL NOT NULL DEFAULT 0.0,
      refrendo_amount REAL NOT NULL DEFAULT 0.0,
      total_due REAL NOT NULL DEFAULT 0.0,
      due_date TEXT,
      subsidy_active INTEGER DEFAULT 1,
      subsidy_condition TEXT DEFAULT 'Subsidio del 100% en tenencia al pagar refrendo antes del 31 de marzo',
      status TEXT DEFAULT 'PENDIENTE',
      promotions TEXT DEFAULT 'Descuento por pronto pago aplicable',
      last_scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      UNIQUE(vehicle_id, year)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT uq_user_type_created UNIQUE (user_id, type, created_at)
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  `;

  await query.exec(schema);
  console.log('Tablas inicializadas correctamente (users, vehicles, vehicle_tenencias, notifications).');
};

module.exports = {
  db,
  query,
  initDatabase
};
