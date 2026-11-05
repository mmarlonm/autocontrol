const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { initDatabase } = require('./config/database');
const { initCronJobs } = require('./services/cronService');

const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const scraperRoutes = require('./routes/scraperRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging básico de peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/scraper', scraperRoutes);

// Endpoint de salud (Health check)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'AutoControl México - Backend API',
    time: new Date().toISOString()
  });
});

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.url}`
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor tras inicializar la base de datos y tareas programadas
const startServer = async () => {
  try {
    await initDatabase();
    
    // Iniciar el cron job diario exactamente a las 8:00 AM
    initCronJobs();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor AutoControl API corriendo en puerto: http://localhost:${PORT}`);
      console.log(`   - Endpoint de salud: http://localhost:${PORT}/health`);
      console.log(`   - Sincronización Scraper programada diariamente a las 8:00 AM`);
    });

    return server;
  } catch (error) {
    console.error('Error fatal al iniciar servidor:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
