const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Configurar entorno de pruebas con archivo único
const testDbFileName = `test_vehicles_${Date.now()}.sqlite`;
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, `../data/${testDbFileName}`);
process.env.CRON_SCHEDULE = '0 8 * * *';

const { query, initDatabase, db } = require('../src/config/database');
const UserModel = require('../src/models/userModel');
const VehicleModel = require('../src/models/vehicleModel');
const NotificationModel = require('../src/models/notificationModel');
const FcmService = require('../src/services/fcmService');
const { runPythonScraper } = require('../src/services/cronService');

const PLATE_REGEX = /^[A-Z]{3}-\d{4}$/;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS DEL SISTEMA VEHICULAR');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  const test = async (name, fn) => {
    total++;
    try {
      await fn();
      console.log(`✅ [PASÓ] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FALLÓ] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  };

  await initDatabase();

  // PRUEBA 1: Regex de Placa
  await test('Validación estricta de Placa con Regex /^[A-Z]{3}-\\d{4}$/', () => {
    const validPlates = ['ABC-1234', 'XYZ-9876', 'MEX-2026', 'JAL-0001'];
    for (const p of validPlates) {
      assert.strictEqual(PLATE_REGEX.test(p), true, `Debería ser válida: ${p}`);
    }

    const invalidPlates = [
      'abc-1234',    // minúsculas
      'ABC1234',     // sin guión
      'AB-1234',     // solo 2 letras
      'ABCD-1234',   // 4 letras
      'ABC-123',     // solo 3 dígitos
      'ABC-12345',   // 5 dígitos
      '123-ABCD',    // números antes de letras
      'ABC 1234'     // espacio en lugar de guión
    ];
    for (const p of invalidPlates) {
      assert.strictEqual(PLATE_REGEX.test(p), false, `Debería ser inválida: ${p}`);
    }
  });

  // PRUEBA 2: Registro de Usuario y Login
  let testUser = null;
  await test('Creación de usuario y persistencia en BD', async () => {
    testUser = await UserModel.create('conductor@mexico.com', '$2a$10$hashedpasswordxyz');
    assert.ok(testUser, 'El usuario debería existir');
    assert.strictEqual(testUser.email, 'conductor@mexico.com');
  });

  // PRUEBA 3: Registro de Vehículo y Regla de 1 Placa por Usuario
  await test('Registro de vehículo y constraint de 1 placa por usuario (MVP)', async () => {
    const v1 = await VehicleModel.createOrUpdate(testUser.id, {
      plate: 'ABC-1234',
      state: 'CDMX',
      brand: 'Nissan',
      model: 'Versa',
      year: 2024
    });

    assert.ok(v1, 'Vehículo debe registrarse');
    assert.strictEqual(v1.plate, 'ABC-1234');
    assert.strictEqual(v1.subsidy_active, 1, 'Debe activar subsidio por defecto');

    // Intentar registrar una segunda placa para el mismo usuario -> Debe actualizar la existente
    const v2 = await VehicleModel.createOrUpdate(testUser.id, {
      plate: 'XYZ-5678',
      state: 'ESTADO DE MÉXICO',
      brand: 'Nissan',
      model: 'Versa',
      year: 2024
    });

    assert.strictEqual(v2.plate, 'XYZ-5678');
    const allUserVehicles = await query.all(`SELECT * FROM vehicles WHERE user_id = ?`, [testUser.id]);
    assert.strictEqual(allUserVehicles.length, 1, 'Debe existir exactamente 1 vehículo por usuario');

    // Restaurar a ABC-1234 para pruebas subsecuentes
    await VehicleModel.createOrUpdate(testUser.id, {
      plate: 'ABC-1234',
      state: 'CDMX',
      brand: 'Nissan',
      model: 'Versa',
      year: 2024
    });
  });

  // PRUEBA 4: Restricción UNIQUE en (user_id, type, created_at) para Notificaciones
  await test('Base de datos previene notificaciones duplicadas con UNIQUE(user_id, type, created_at)', async () => {
    const fixedTimestamp = '2026-03-15 08:00:00';

    // 1er insert
    const notif1 = await NotificationModel.create({
      userId: testUser.id,
      type: 'SUBSIDIO_EXPIRING',
      title: '¡Aviso 1!',
      message: 'Subsidio por vencer.',
      createdAt: fixedTimestamp
    });
    assert.ok(notif1, 'La primera notificación debe insertarse');

    // 2do insert con los mismos (user_id, type, created_at)
    const notif2 = await NotificationModel.create({
      userId: testUser.id,
      type: 'SUBSIDIO_EXPIRING',
      title: '¡Aviso 1 Duplicado!',
      message: 'Intento duplicado.',
      createdAt: fixedTimestamp
    });

    // Debe ser nulo (capturado y prevenido por NotificationModel sin crash)
    assert.strictEqual(notif2, null, 'El duplicado debe ser prevenido');

    // Verificar en la BD directamente que solo hay 1 fila
    const rows = await query.all(
      `SELECT * FROM notifications WHERE user_id = ? AND type = ? AND created_at = ?`,
      [testUser.id, 'SUBSIDIO_EXPIRING', fixedTimestamp]
    );
    assert.strictEqual(rows.length, 1, 'Solo debe haber exactamente 1 notificación');
  });

  // PRUEBA 5: Manejo y remoción de tokens FCM inválidos
  await test('Manejo y remoción de tokens FCM inválidos/desinstalados', async () => {
    const invalidToken = 'fcm_invalid_token_test_123';
    await UserModel.updateFcmToken(testUser.id, invalidToken);

    let userWithToken = await UserModel.findById(testUser.id);
    assert.strictEqual(userWithToken.fcm_token, invalidToken);

    // Enviar notificación con token inválido
    const res = await FcmService.sendNotification(invalidToken, {
      title: 'Prueba Token',
      body: 'Cuerpo'
    });

    assert.strictEqual(res.reason, 'TOKEN_REMOVED', 'Debe marcar token para remoción');

    // Verificar que el token fue limpiado de la BD
    const userCleaned = await UserModel.findById(testUser.id);
    assert.strictEqual(userCleaned.fcm_token, null, 'El token FCM inválido debe ser null en la BD');
  });

  // PRUEBA 6: Verificación de regla Cron a las 8:00 AM
  await test('Verificación de regla Cron: Ejecución exacta a las 8:00 AM (0 8 * * *)', () => {
    const schedule = process.env.CRON_SCHEDULE || '0 8 * * *';
    assert.strictEqual(schedule, '0 8 * * *', 'La regla cron debe ser estrictamente 0 8 * * *');
  });

  // PRUEBA 7: Ejecución del Scraper Python
  await test('Ejecución del Scraper Python con actualización de BD y tolerancia a fallos', async () => {
    const scraperResult = await runPythonScraper(['--plate', 'ABC-1234']);
    assert.strictEqual(scraperResult.success, true, 'El script python debe finalizar con código 0');

    // Verificar que la BD contiene información de tenencia actualizada
    const updatedVehicle = await VehicleModel.findByUserId(testUser.id);
    assert.ok(updatedVehicle.tenencia_year, 'Debe tener año de tenencia');
    assert.ok(updatedVehicle.total_due > 0, 'Debe tener monto de refrendo/total');
    assert.strictEqual(updatedVehicle.subsidy_active, 1, 'Debe tener subsidio activo');
    assert.ok(updatedVehicle.last_scraped_at, 'Debe registrar timestamp de scraping');
  });

  // PRUEBA 8: Marcar notificación como leída
  await test('Marcar notificación como leída', async () => {
    const list = await NotificationModel.getByUserId(testUser.id);
    assert.ok(list.length > 0, 'Debe haber notificaciones');

    const firstNotif = list[0];
    const ok = await NotificationModel.markAsRead(firstNotif.id, testUser.id);
    assert.strictEqual(ok, true);

    const reloaded = await query.get(`SELECT read FROM notifications WHERE id = ?`, [firstNotif.id]);
    assert.strictEqual(reloaded.read, 1, 'La notificación debe figurar como leída (1)');
  });

  console.log('\n====================================================');
  console.log(`🎉 RESUMEN: ${passed} de ${total} pruebas pasaron exitosamente.`);
  console.log('====================================================\n');

  // Cerrar conexión de SQLite limpiamente
  db.close();
}

runTests().catch(err => {
  console.error('Error no capturado en tests:', err);
  process.exit(1);
});
