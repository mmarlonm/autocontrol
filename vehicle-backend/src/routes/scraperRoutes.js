const express = require('express');
const router = express.Router();
const { runPythonScraper, getScraperState } = require('../services/cronService');
const authMiddleware = require('../middleware/authMiddleware');

// Ver estado del scraper
router.get('/status', (req, res) => {
  return res.status(200).json({
    success: true,
    data: getScraperState()
  });
});

// Disparar scraper manualmente (requiere autenticación)
router.post('/trigger', authMiddleware, async (req, res) => {
  try {
    const { plate } = req.body;
    const args = plate ? ['--plate', plate] : [];

    // Ejecutar en segundo plano o esperar
    const resultPromise = runPythonScraper(args);

    if (req.query.async === 'true') {
      return res.status(202).json({
        success: true,
        message: 'Scraper Python iniciado en segundo plano.',
        state: getScraperState()
      });
    }

    const result = await resultPromise;
    return res.status(200).json({
      success: result.success,
      message: result.success ? 'Scraper ejecutado exitosamente.' : 'Scraper finalizó con errores.',
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al disparar scraper.',
      error: error.message
    });
  }
});

// Ejecutar scraper vía cron-job.org (SIN autenticación)
// Usado por: cron-job.org para ejecutar diariamente a las 8 AM
router.post('/run', async (req, res) => {
  try {
    console.log('[ScraperRoute /run] Ejecutando scraper (vía cron-job.org)...');

    // Ejecutar en segundo plano
    const resultPromise = runPythonScraper();

    // Responder inmediatamente (el scraper corre en background)
    return res.status(202).json({
      success: true,
      message: 'Scraper iniciado exitosamente en segundo plano',
      state: getScraperState(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ScraperRoute /run] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al ejecutar scraper',
      error: error.message
    });
  }
});

module.exports = router;

