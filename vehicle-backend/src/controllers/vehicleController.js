const VehicleModel = require('../models/vehicleModel');

// Expresión regular requerida: formato ABC-1234 (3 letras mayúsculas, guión, 4 dígitos)
const PLATE_REGEX = /^[A-Z]{3}-\d{4}$/;

const VehicleController = {
  // Registrar o actualizar vehiculo (1 vehiculo por usuario MVP)
  registerVehicle: async (req, res) => {
    try {
      const userId = req.user.id;
      let { plate, state = 'CDMX', brand, model, year, serial_number } = req.body;

      if (!plate) {
        return res.status(400).json({
          success: false,
          message: 'La placa vehicular es obligatoria.'
        });
      }

      plate = plate.toUpperCase().trim();

      // VALIDACION CRITICA: Regex /^[A-Z]{3}-\d{4}$/
      if (!PLATE_REGEX.test(plate)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de placa inválido. Debe cumplir con el estándar mexicano: ABC-1234 (3 letras mayúsculas, guión y 4 dígitos).'
        });
      }

      // Validar si la placa ya está registrada por otro usuario
      const existingPlate = await VehicleModel.findByPlate(plate);
      if (existingPlate && existingPlate.user_id !== userId) {
        return res.status(409).json({
          success: false,
          message: 'Esta placa ya ha sido registrada por otro usuario en el sistema.'
        });
      }

      const vehicle = await VehicleModel.createOrUpdate(userId, {
        plate,
        state,
        brand: brand || 'Genérico',
        model: model || 'Sedán',
        year: year ? parseInt(year, 10) : new Date().getFullYear(),
        serial_number: serial_number || ''
      });

      return res.status(201).json({
        success: true,
        message: 'Vehículo registrado correctamente con información de tenencias y subsidios.',
        data: {
          vehicle
        }
      });
    } catch (error) {
      console.error('[VehicleController.registerVehicle] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno al registrar vehículo.',
        error: error.message
      });
    }
  },

  // Obtener el vehiculo del usuario autenticado
  getMyVehicle: async (req, res) => {
    try {
      const userId = req.user.id;
      const vehicle = await VehicleModel.findByUserId(userId);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'No tienes ningún vehículo registrado todavía.',
          data: { vehicle: null }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          vehicle
        }
      });
    } catch (error) {
      console.error('[VehicleController.getMyVehicle] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener datos del vehículo.',
        error: error.message
      });
    }
  },

  // Obtener estado detallado de adeudos, subsidios y promociones (año más reciente)
  getVehicleStatus: async (req, res) => {
    try {
      const userId = req.user.id;
      const vehicle = await VehicleModel.findByUserId(userId);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'No tienes ningún vehículo registrado.'
        });
      }

      const currentYear = new Date().getFullYear();

      const statusDetails = {
        plate: vehicle.plate,
        state: vehicle.state,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        tenencia: {
          year: vehicle.tenencia_year || currentYear,
          status: vehicle.tenencia_status || 'PENDIENTE',
          tenencia_base: vehicle.tenencia_amount !== undefined ? Number(vehicle.tenencia_amount) : 3200.0,
          subsidio_aplicado: vehicle.subsidy_active ? (vehicle.subsidy_amount !== undefined ? Number(vehicle.subsidy_amount) : 3200.0) : 0.0,
          refrendo_a_pagar: vehicle.refrendo_amount !== undefined ? Number(vehicle.refrendo_amount) : (vehicle.tenencia_status === 'PAGADO' ? 0.0 : 698.0),
          total_a_pagar: vehicle.total_due !== undefined ? Number(vehicle.total_due) : (vehicle.tenencia_status === 'PAGADO' ? 0.0 : 698.0),
          fecha_limite_subsidio: vehicle.due_date || `${currentYear}-03-31`,
          subsidio_activo: !!vehicle.subsidy_active,
          condicion_subsidio: vehicle.subsidy_condition || 'Subsidio del 100% en tenencia al pagar refrendo antes del 31 de marzo',
          promociones_vigentes: vehicle.promotions || '100% de subsidio en tenencia para personas físicas sin adeudos previos',
          ultima_actualizacion: vehicle.last_scraped_at
        }
      };

      return res.status(200).json({
        success: true,
        data: statusDetails
      });
    } catch (error) {
      console.error('[VehicleController.getVehicleStatus] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al consultar estado de tenencias y subsidios.',
        error: error.message
      });
    }
  },

  // Obtener TODAS las tenencias de todos los años
  getAllTenencias: async (req, res) => {
    try {
      const userId = req.user.id;
      console.log(`[VehicleController.getAllTenencias] 🔍 Solicitando tenencias para userId: ${userId}`);

      const vehicle = await VehicleModel.findByUserId(userId);

      if (!vehicle) {
        console.warn(`[VehicleController.getAllTenencias] ⚠️ No se encontró vehículo para userId: ${userId}`);
        return res.status(404).json({
          success: false,
          message: 'No tienes ningún vehículo registrado.'
        });
      }

      const allTenencias = await VehicleModel.getAllTenenciasByUserId(userId);
      console.log(`[VehicleController.getAllTenencias] ✅ ${allTenencias.length} tenencias encontradas para placa ${vehicle.plate}`);

      const formattedTenencias = allTenencias.map(t => ({
        year: Number(t.year),
        status: t.status || 'PENDIENTE',
        tenencia_base: t.tenencia_amount !== undefined ? Number(t.tenencia_amount) : 3200.0,
        subsidio_aplicado: t.subsidy_active ? (t.subsidy_amount !== undefined ? Number(t.subsidy_amount) : 3200.0) : 0.0,
        refrendo_a_pagar: t.refrendo_amount !== undefined ? Number(t.refrendo_amount) : (t.status === 'PAGADO' ? 0.0 : 698.0),
        total_a_pagar: t.total_due !== undefined ? Number(t.total_due) : (t.status === 'PAGADO' ? 0.0 : 698.0),
        fecha_limite: t.due_date || `${t.year}-03-31`,
        subsidio_activo: !!t.subsidy_active,
        condicion_subsidio: t.subsidy_condition || '',
        promociones: t.promotions || '',
        ultima_actualizacion: t.last_scraped_at
      }));

      return res.status(200).json({
        success: true,
        data: {
          plate: vehicle.plate,
          state: vehicle.state,
          brand: vehicle.brand,
          model: vehicle.model,
          vehicle_year: vehicle.year,
          tenencias: formattedTenencias
        }
      });
    } catch (error) {
      console.error('[VehicleController.getAllTenencias] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al consultar todas las tenencias.',
        error: error.message
      });
    }
  },

  // Actualizar datos del vehiculo
  updateVehicle: async (req, res) => {
    try {
      const userId = req.user.id;
      const { plate, state, brand, model, year, serial_number } = req.body;

      const current = await VehicleModel.findByUserId(userId);
      if (!current) {
        return res.status(404).json({
          success: false,
          message: 'No existe ningún vehículo registrado para actualizar.'
        });
      }

      if (plate) {
        const cleanPlate = plate.toUpperCase().trim();
        if (!PLATE_REGEX.test(cleanPlate)) {
          return res.status(400).json({
            success: false,
            message: 'Formato de placa inválido. Debe cumplir con el estándar mexicano: ABC-1234.'
          });
        }
        // Validar si pertenece a otro usuario
        const existingPlate = await VehicleModel.findByPlate(cleanPlate);
        if (existingPlate && existingPlate.user_id !== userId) {
          return res.status(409).json({
            success: false,
            message: 'Esta placa ya ha sido registrada por otro usuario en el sistema.'
          });
        }
      }

      const updated = await VehicleModel.createOrUpdate(userId, {
        plate: plate || current.plate,
        state: state || current.state,
        brand: brand || current.brand,
        model: model || current.model,
        year: year ? parseInt(year, 10) : current.year,
        serial_number: serial_number !== undefined ? serial_number : current.serial_number
      });

      return res.status(200).json({
        success: true,
        message: 'Vehículo actualizado con éxito.',
        data: {
          vehicle: updated
        }
      });
    } catch (error) {
      console.error('[VehicleController.updateVehicle] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar vehículo.',
        error: error.message
      });
    }
  }
};

module.exports = VehicleController;

