#!/usr/bin/env node
/**
 * Script para inicializar la base de datos en Supabase
 * Uso: node init-supabase.js
 */

const { Client } = require('pg');
require('dotenv').config({ path: './.env.production' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL no está configurado en .env.production');
  process.exit(1);
}

console.log('🔌 Conectando a Supabase PostgreSQL...');
console.log(`Host: ${process.env.DB_HOST}`);

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false } // Necesario para Supabase
});

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
  CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  CREATE INDEX IF NOT EXISTS idx_tenencias_vehicle ON vehicle_tenencias(vehicle_id);
`;

async function initializeDatabase() {
  try {
    await client.connect();
    console.log('✅ Conectado a Supabase');

    console.log('\n📝 Creando tablas...');

    // Dividir script por sentencias
    const statements = schema
      .split(';')
      .filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      try {
        await client.query(statement + ';');
      } catch (err) {
        // Ignorar errores de "ya existe"
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }
    }

    console.log('✅ Tablas creadas/verificadas correctamente');

    // Verificar que las tablas existen
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log('\n📊 Tablas en Supabase:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log('\n✅ BASE DE DATOS INICIALIZADA EXITOSAMENTE');
    console.log('\n📌 Próximo paso: Deploy a Railway.app');
    console.log('   1. Ir a https://railway.app');
    console.log('   2. New Project → Deploy from GitHub');
    console.log('   3. Seleccionar vehicle-mgm');
    console.log('   4. Agregar variables de entorno (ver DEPLOY_SUPABASE.md)');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initializeDatabase();
