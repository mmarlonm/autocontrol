const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const FcmService = require('./fcmService');
const UserModel = require('../models/userModel');
const NotificationModel = require('../models/notificationModel');
const { query } = require('../config/database');
require('dotenv').config();

// CRITICAL VALIDATION: Cron corre EXACTAMENTE a las 8:00 AM ('0 8 * * *')
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 8 * * *';
const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const SCRAPER_SCRIPT = process.env.SCRAPER_SCRIPT_PATH
  ? path.resolve(process.env.SCRAPER_SCRIPT_PATH)
  : path.join(__dirname, '../../scrapers/main.py');

let scraperState = {
  isRunning: false,
  lastRunAt: null,
  lastStatus: null,
  lastOutput: ''
};

/**
 * Ejecuta el script Python como subproceso
 */
const runPythonScraper = (args = []) => {
  return new Promise((resolve, reject) => {
    if (scraperState.isRunning) {
      console.warn('[CronService] El scraper ya está en ejecución.');
      return resolve({ running: true, message: 'Scraper ya en ejecución' });
    }

    scraperState.isRunning = true;
    scraperState.lastRunAt = new Date().toISOString();
    scraperState.lastOutput = '';

    console.log(`[CronService] Iniciando subproceso Python: ${PYTHON_PATH} ${SCRAPER_SCRIPT} ${args.join(' ')}`);

    const pythonProcess = spawn(PYTHON_PATH, [SCRAPER_SCRIPT, ...args], {
      cwd: path.dirname(SCRAPER_SCRIPT),
      env: { ...process.env }
    });

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      stdoutData += text;
      process.stdout.write(`[Python] ${text}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString();
      stderrData += text;
      process.stderr.write(`[Python ERR] ${text}`);
    });

    pythonProcess.on('close', async (code) => {
      scraperState.isRunning = false;
      scraperState.lastStatus = code === 0 ? 'SUCCESS' : `FAILED_CODE_${code}`;
      scraperState.lastOutput = stdoutData + (stderrData ? `\nERRORS:\n${stderrData}` : '');

      console.log(`[CronService] Proceso Python finalizado con código de salida: ${code}`);

      if (code === 0) {
        // Enviar notificaciones push FCM automáticas a todos los usuarios que tengan token
        try {
          await notifyUsersAfterScrape();
        } catch (notifErr) {
          console.error('[CronService] Error enviando push post-scraping:', notifErr.message);
        }
        resolve({ success: true, code, output: stdoutData });
      } else {
        console.error(`[CronService] Error en scraper Python (code ${code}):`, stderrData);
        resolve({ success: false, code, error: stderrData, output: stdoutData });
      }
    });

    pythonProcess.on('error', (err) => {
      scraperState.isRunning = false;
      scraperState.lastStatus = 'SPAWN_ERROR';
      scraperState.lastOutput = err.message;
      console.error('[CronService] Error al lanzar el subproceso Python:', err);
      reject(err);
    });
  });
};

/**
 * Notifica a los usuarios con placas registradas después del scraper
 * usando FCM Push sin consumir batería del dispositivo
 */
const notifyUsersAfterScrape = async () => {
  const usersWithTokens = await query.all(`
    SELECT u.id, u.email, u.fcm_token, v.plate, t.total_due, t.due_date, t.subsidy_active
    FROM users u
    JOIN vehicles v ON u.id = v.user_id
    JOIN vehicle_tenencias t ON v.id = t.vehicle_id
    WHERE u.fcm_token IS NOT NULL
  `);

  for (const user of usersWithTokens) {
    const title = user.subsidy_active
      ? `🎉 Subsidio 100% Confirmado - Placa ${user.plate}`
      : `⚠️ Adeudo de Tenencia - Placa ${user.plate}`;

    const body = user.subsidy_active
      ? `Aprovecha el subsidio del 100%. Paga únicamente $${Number(user.total_due).toFixed(2)} de refrendo antes del ${user.due_date}.`
      : `Tu vehículo con placa ${user.plate} presenta un adeudo total de $${Number(user.total_due).toFixed(2)}.`;

    await FcmService.sendNotification(user.fcm_token, {
      title,
      body,
      data: {
        type: 'SCRAPER_DAILY_UPDATE',
        plate: user.plate,
        total_due: user.total_due.toString()
      }
    });
  }
};

/**
 * Inicialización del programador diario EXACTAMENTE a las 8:00 AM
 */
const initCronJobs = () => {
  console.log(`[CronService] Programando tarea diaria de scraping con regla: "${CRON_SCHEDULE}" (8:00 AM)`);

  const task = cron.schedule(
    CRON_SCHEDULE,
    async () => {
      console.log('⏰ [8:00 AM Cron Job] Ejecutando sincronización diaria oficial de tenencias vehiculares...');
      try {
        await runPythonScraper();
      } catch (err) {
        console.error('❌ [Cron Job] Falla al ejecutar scraper a las 8:00 AM:', err.message);
      }
    },
    {
      scheduled: true,
      timezone: 'America/Mexico_City'
    }
  );

  return task;
};

module.exports = {
  initCronJobs,
  runPythonScraper,
  getScraperState: () => ({ ...scraperState })
};
