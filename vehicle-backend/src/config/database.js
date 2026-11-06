const { Client } = require('pg');
const path = require('path');

// Solo cargar .env en desarrollo (no existe en Render)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}

// Log para debugging en Render
console.log('[DATABASE] NODE_ENV:', process.env.NODE_ENV);
console.log('[DATABASE] DATABASE_URL available:', !!process.env.DATABASE_URL);

let connectionConfig;

// En Render, DATABASE_URL debe estar en variables de entorno
const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  // Verificar que la URL sea válida
  if (!dbUrl.includes('postgresql://') && !dbUrl.includes('postgres://')) {
    console.error('[DATABASE] ERROR: DATABASE_URL no parece una URL de PostgreSQL válida');
    console.error('[DATABASE] DATABASE_URL debe empezar con postgresql:// o postgres://');
    process.exit(1);
  }

  console.log('[DATABASE] Usando DATABASE_URL de variables de entorno');
  connectionConfig = { connectionString: dbUrl };
} else if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
  // Fallback: construir URL desde variables individuales
  console.log('[DATABASE] Construyendo URL desde variables individuales');
  connectionConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  };
} else {
  console.error('[DATABASE] CRITICAL ERROR: No hay conexión a BD configurada');
  console.error('[DATABASE] Necesitas DATABASE_URL o DB_HOST/DB_USER/DB_PASSWORD');
  process.exit(1);
}

// Agregar SSL para Render/Supabase
if (process.env.NODE_ENV === 'production') {
  connectionConfig.ssl = { rejectUnauthorized: false };
}

console.log('[DATABASE] Intentando conectar...');
const client = new Client(connectionConfig);

const db = client;
if (db && !db.close) {
  db.close = (cb) => db.end(cb);
}

client.connect((err) => {
  if (err) {
    console.error('Error al conectar con PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a PostgreSQL (Supabase)');
  }
});

/**
 * Promisified database helpers para PostgreSQL
 */
const query = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      client.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve({ lastID: result.rows[0]?.id, changes: result.rowCount });
      });
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      client.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result.rows[0] || null);
      });
    });
  },

  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      client.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve(result.rows || []);
      });
    });
  },

  exec: (sql) => {
    return new Promise((resolve, reject) => {
      client.query(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

/**
 * Inicializar tablas (PostgreSQL compatible)
 */
const initDatabase = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      fcm_token TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE,
      plate TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'CDMX',
      brand TEXT,
      model TEXT,
      year INTEGER,
      serial_number TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vehicle_tenencias (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      tenencia_amount NUMERIC(10,2) NOT NULL DEFAULT 0.0,
      subsidy_amount NUMERIC(10,2) NOT NULL DEFAULT 0.0,
      refrendo_amount NUMERIC(10,2) NOT NULL DEFAULT 0.0,
      total_due NUMERIC(10,2) NOT NULL DEFAULT 0.0,
      due_date TEXT,
      subsidy_active SMALLINT DEFAULT 1,
      subsidy_condition TEXT DEFAULT 'Subsidio del 100% en tenencia al pagar refrendo antes del 31 de marzo',
      status TEXT DEFAULT 'PENDIENTE',
      promotions TEXT DEFAULT 'Descuento por pronto pago aplicable',
      last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      UNIQUE(vehicle_id, year)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read SMALLINT DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT uq_user_type_created UNIQUE (user_id, type, created_at)
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  `;

  try {
    await query.exec(schema);
    console.log('✅ Tablas inicializadas correctamente en PostgreSQL');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('✅ Tablas ya existen en la base de datos');
    } else {
      throw err;
    }
  }
};

module.exports = {
  db,
  query,
  initDatabase
};

