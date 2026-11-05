const assert = require('assert');
const path = require('path');
const http = require('http');

// Configurar entorno de pruebas con archivo único
const testDbFileName = `test_api_${Date.now()}.sqlite`;
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, `../data/${testDbFileName}`);
process.env.PORT = '3005';
process.env.CRON_SCHEDULE = '0 8 * * *';

const { startServer } = require('../src/server');

const makeRequest = (method, pathUrl, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3005,
      path: pathUrl,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
};

async function runApiTests() {
  console.log('\n====================================================');
  console.log('🌐 INICIANDO PRUEBAS HTTP END-TO-END DE LA API REST');
  console.log('====================================================\n');

  const server = await startServer();

  try {
    // 1. Health check
    console.log('1. Probando GET /health...');
    const health = await makeRequest('GET', '/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.status, 'ok');
    console.log('   -> Health check OK');

    // 2. Registro de Usuario (Signup)
    console.log('2. Probando POST /api/auth/register...');
    const signup = await makeRequest('POST', '/api/auth/register', {
      email: 'test_conductor@mexico.com',
      password: 'password123',
      fcm_token: 'valid_test_fcm_token_123'
    });
    assert.strictEqual(signup.status, 201);
    assert.ok(signup.data.data.token, 'Debe devolver token JWT');
    const token = signup.data.data.token;
    console.log('   -> Usuario registrado exitosamente');

    // 3. Login
    console.log('3. Probando POST /api/auth/login...');
    const login = await makeRequest('POST', '/api/auth/login', {
      email: 'test_conductor@mexico.com',
      password: 'password123'
    });
    assert.strictEqual(login.status, 200);
    assert.strictEqual(login.data.data.user.email, 'test_conductor@mexico.com');
    console.log('   -> Login exitoso con credenciales válidas');

    // 4. Validación de Placa inválida (debe fallar)
    console.log('4. Probando POST /api/vehicles con placa inválida (debe rechazar)...');
    const invalidPlate = await makeRequest('POST', '/api/vehicles', {
      plate: 'INVALIDA123',
      state: 'CDMX'
    }, token);
    assert.strictEqual(invalidPlate.status, 400);
    assert.strictEqual(invalidPlate.data.success, false);
    console.log('   -> Placa inválida rechazada correctamente por regex');

    // 5. Registro de Placa válida (ABC-1234)
    console.log('5. Probando POST /api/vehicles con placa ABC-1234...');
    const validVehicle = await makeRequest('POST', '/api/vehicles', {
      plate: 'ABC-1234',
      state: 'CDMX',
      brand: 'Nissan',
      model: 'Sentra',
      year: 2025
    }, token);
    assert.strictEqual(validVehicle.status, 201);
    assert.strictEqual(validVehicle.data.data.vehicle.plate, 'ABC-1234');
    console.log('   -> Vehículo ABC-1234 registrado exitosamente');

    // 6. Consulta de Vehículo y Estado
    console.log('6. Probando GET /api/vehicles/status...');
    const statusRes = await makeRequest('GET', '/api/vehicles/status', null, token);
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.data.data.plate, 'ABC-1234');
    assert.strictEqual(statusRes.data.data.tenencia.subsidio_activo, true);
    console.log('   -> Estado financiero de tenencia obtenido OK');

    // 7. Disparar Scraper vía API
    console.log('7. Probando POST /api/scraper/trigger...');
    const trigger = await makeRequest('POST', '/api/scraper/trigger', { plate: 'ABC-1234' }, token);
    assert.strictEqual(trigger.status, 200);
    assert.strictEqual(trigger.data.success, true);
    console.log('   -> Scraper Python ejecutado exitosamente vía endpoint HTTP');

    // 8. Consultar Notificaciones
    console.log('8. Probando GET /api/notifications...');
    const notifs = await makeRequest('GET', '/api/notifications', null, token);
    assert.strictEqual(notifs.status, 200);
    assert.ok(notifs.data.data.notifications.length > 0, 'Debe haber notificaciones generadas');
    console.log(`   -> ${notifs.data.data.notifications.length} notificación(es) obtenidas`);

    // 9. Marcar Notificación como leída
    const firstNotifId = notifs.data.data.notifications[0].id;
    console.log(`9. Probando PUT /api/notifications/${firstNotifId}/read...`);
    const readRes = await makeRequest('PUT', `/api/notifications/${firstNotifId}/read`, null, token);
    assert.strictEqual(readRes.status, 200);
    assert.strictEqual(readRes.data.success, true);
    console.log('   -> Notificación marcada como leída');

    console.log('\n====================================================');
    console.log('🎉 TODAS LAS PRUEBAS HTTP END-TO-END PASARON CON ÉXITO');
    console.log('====================================================\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runApiTests().catch(err => {
  console.error('Falla en pruebas API:', err);
  process.exit(1);
});
