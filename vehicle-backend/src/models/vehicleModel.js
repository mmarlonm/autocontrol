const { query } = require('../config/database');

const VehicleModel = {
  // Un solo vehiculo por usuario (MVP)
  findByUserId: async (userId) => {
    const sql = `
      SELECT v.*, 
             t.id as tenencia_id,
             t.year as tenencia_year,
             t.tenencia_amount,
             t.subsidy_amount,
             t.refrendo_amount,
             t.total_due,
             t.due_date,
             t.subsidy_active,
             t.subsidy_condition,
             t.status as tenencia_status,
             t.promotions,
             t.last_scraped_at
      FROM vehicles v
      LEFT JOIN vehicle_tenencias t ON v.id = t.vehicle_id
      WHERE v.user_id = ?
      ORDER BY t.year DESC
      LIMIT 1
    `;
    return query.get(sql, [userId]);
  },

  findByPlate: async (plate) => {
    const sql = `SELECT * FROM vehicles WHERE UPPER(plate) = UPPER(?)`;
    return query.get(sql, [plate.trim()]);
  },

  createOrUpdate: async (userId, vehicleData) => {
    const { plate, state = 'CDMX', brand = '', model = '', year = new Date().getFullYear(), serial_number = '' } = vehicleData;
    const cleanPlate = plate.toUpperCase().trim();

    const existing = await query.get(`SELECT id FROM vehicles WHERE user_id = ?`, [userId]);

    if (existing) {
      const updateSql = `
        UPDATE vehicles
        SET plate = ?, state = ?, brand = ?, model = ?, year = ?, serial_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;
      await query.run(updateSql, [cleanPlate, state, brand, model, year, serial_number, userId]);
      return VehicleModel.findByUserId(userId);
    } else {
      const insertSql = `
        INSERT INTO vehicles (user_id, plate, state, brand, model, year, serial_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const res = await query.run(insertSql, [userId, cleanPlate, state, brand, model, year, serial_number]);
      
      // Crear registro inicial de tenencia por defecto para el año corriente
      const currentYear = new Date().getFullYear();
      await VehicleModel.upsertTenencia(res.lastID, {
        year: currentYear,
        tenencia_amount: 3200.0,
        subsidy_amount: 3200.0,
        refrendo_amount: 698.0,
        total_due: 698.0,
        due_date: `${currentYear}-03-31`,
        subsidy_active: 1,
        subsidy_condition: 'Subsidio del 100% sobre tenencia cubriendo el refrendo antes del 31 de marzo',
        status: 'PENDIENTE',
        promotions: 'Descuento 100% en tenencia vehiculo al corriente'
      });

      return VehicleModel.findByUserId(userId);
    }
  },

  upsertTenencia: async (vehicleId, tenenciaData) => {
    const {
      year = new Date().getFullYear(),
      tenencia_amount = 0.0,
      subsidy_amount = 0.0,
      refrendo_amount = 0.0,
      total_due = 0.0,
      due_date = null,
      subsidy_active = 1,
      subsidy_condition = '',
      status = 'PENDIENTE',
      promotions = ''
    } = tenenciaData;

    const sql = `
      INSERT INTO vehicle_tenencias (
        vehicle_id, year, tenencia_amount, subsidy_amount, refrendo_amount,
        total_due, due_date, subsidy_active, subsidy_condition, status, promotions, last_scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(vehicle_id, year) DO UPDATE SET
        tenencia_amount = excluded.tenencia_amount,
        subsidy_amount = excluded.subsidy_amount,
        refrendo_amount = excluded.refrendo_amount,
        total_due = excluded.total_due,
        due_date = excluded.due_date,
        subsidy_active = excluded.subsidy_active,
        subsidy_condition = excluded.subsidy_condition,
        status = excluded.status,
        promotions = excluded.promotions,
        last_scraped_at = CURRENT_TIMESTAMP
    `;

    return query.run(sql, [
      vehicleId, year, tenencia_amount, subsidy_amount, refrendo_amount,
      total_due, due_date, subsidy_active, subsidy_condition, status, promotions
    ]);
  },

  getAllVehiclesForScraping: async () => {
    const sql = `
      SELECT v.id as vehicle_id, v.user_id, v.plate, v.state, v.brand, v.model, v.year, u.email, u.fcm_token
      FROM vehicles v
      JOIN users u ON v.user_id = u.id
    `;
    return query.all(sql);
  }
};

module.exports = VehicleModel;

