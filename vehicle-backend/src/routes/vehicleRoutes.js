const express = require('express');
const router = express.Router();
const VehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas las rutas de vehiculos requieren autenticación
router.use(authMiddleware);

router.post('/', VehicleController.registerVehicle);
router.get('/', VehicleController.getMyVehicle);
router.get('/status', VehicleController.getVehicleStatus);
router.get('/debts', VehicleController.getVehicleStatus); // Alias
router.put('/', VehicleController.updateVehicle);

module.exports = router;

