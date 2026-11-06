const { admin, collections } = require('../config/database');

const VehicleModel = {
  // Un solo vehiculo por usuario (MVP)
  findByUserId: async (userId) => {
    if (!userId) return null;

    const vSnapshot = await collections.vehicles
      .where('user_id', '==', String(userId))
      .limit(1)
      .get();

    if (vSnapshot.empty) {
      return null;
    }

    const vDoc = vSnapshot.docs[0];
    const vData = vDoc.data();

    // Obtener la tenencia más reciente del vehículo
    const tSnapshot = await collections.vehicleTenencias
      .where('vehicle_id', '==', vDoc.id)
      .get();

    let tenencia = null;
    if (!tSnapshot.empty) {
      const tenencias = tSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      tenencias.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
      tenencia = tenencias[0];
    }

    return {
      id: vDoc.id,
      user_id: vData.user_id,
      plate: vData.plate,
      state: vData.state,
      brand: vData.brand,
      model: vData.model,
      year: vData.year,
      serial_number: vData.serial_number,
      created_at: vData.created_at,
      updated_at: vData.updated_at,
      tenencia_id: tenencia ? tenencia.id : null,
      tenencia_year: tenencia ? tenencia.year : null,
      tenencia_amount: tenencia ? Number(tenencia.tenencia_amount || 0) : 0,
      subsidy_amount: tenencia ? Number(tenencia.subsidy_amount || 0) : 0,
      refrendo_amount: tenencia ? Number(tenencia.refrendo_amount || 0) : 0,
      total_due: tenencia ? Number(tenencia.total_due || 0) : 0,
      due_date: tenencia ? tenencia.due_date : null,
      subsidy_active: tenencia ? (tenencia.subsidy_active !== undefined ? tenencia.subsidy_active : 1) : 1,
      subsidy_condition: tenencia ? tenencia.subsidy_condition : '',
      tenencia_status: tenencia ? (tenencia.status || 'PENDIENTE') : 'PENDIENTE',
      promotions: tenencia ? (tenencia.promotions || '') : '',
      last_scraped_at: tenencia ? tenencia.last_scraped_at : null
    };
  },

  findByPlate: async (plate) => {
    if (!plate) return null;
    const cleanPlate = plate.toUpperCase().trim();

    const snapshot = await collections.vehicles
      .where('plate', '==', cleanPlate)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  },

  createOrUpdate: async (userId, vehicleData) => {
    const {
      plate,
      state = 'CDMX',
      brand = '',
      model = '',
      year = new Date().getFullYear(),
      serial_number = ''
    } = vehicleData;

    const cleanPlate = plate.toUpperCase().trim();
    const nowIso = new Date().toISOString();

    const existingSnap = await collections.vehicles
      .where('user_id', '==', String(userId))
      .limit(1)
      .get();

    let vehicleId;

    if (!existingSnap.empty) {
      const vDoc = existingSnap.docs[0];
      vehicleId = vDoc.id;

      await vDoc.ref.set({
        plate: cleanPlate,
        state,
        brand,
        model,
        year: Number(year),
        serial_number,
        updated_at: nowIso,
        server_updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Registrar evento en historial
      try {
        await collections.vehicleHistory.add({
          vehicle_id: vehicleId,
          user_id: String(userId),
          plate: cleanPlate,
          action: 'UPDATE',
          created_at: nowIso,
          server_timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (hErr) {
        // Historial opcional
      }
    } else {
      const newDocRef = await collections.vehicles.add({
        user_id: String(userId),
        plate: cleanPlate,
        state,
        brand,
        model,
        year: Number(year),
        serial_number,
        created_at: nowIso,
        updated_at: nowIso,
        server_created_at: admin.firestore.FieldValue.serverTimestamp(),
        server_updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      vehicleId = newDocRef.id;

      // Crear registro inicial de tenencia por defecto para el año corriente
      const currentYear = new Date().getFullYear();
      await VehicleModel.upsertTenencia(vehicleId, {
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

      // Registrar evento en historial
      try {
        await collections.vehicleHistory.add({
          vehicle_id: vehicleId,
          user_id: String(userId),
          plate: cleanPlate,
          action: 'CREATE',
          created_at: nowIso,
          server_timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (hErr) {
        // Historial opcional
      }
    }

    return VehicleModel.findByUserId(userId);
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

    const nowIso = new Date().toISOString();
    const tenenciaDocId = `${vehicleId}_${year}`;

    await collections.vehicleTenencias.doc(tenenciaDocId).set({
      vehicle_id: String(vehicleId),
      year: Number(year),
      tenencia_amount: Number(tenencia_amount),
      subsidy_amount: Number(subsidy_amount),
      refrendo_amount: Number(refrendo_amount),
      total_due: Number(total_due),
      due_date: due_date || null,
      subsidy_active: subsidy_active !== undefined ? Number(subsidy_active) : 1,
      subsidy_condition: subsidy_condition || '',
      status: status || 'PENDIENTE',
      promotions: promotions || '',
      last_scraped_at: nowIso,
      server_last_scraped_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, id: tenenciaDocId };
  },

  getAllTenenciasByUserId: async (userId) => {
    if (!userId) return [];

    const vSnapshot = await collections.vehicles
      .where('user_id', '==', String(userId))
      .limit(1)
      .get();

    if (vSnapshot.empty) {
      return [];
    }

    const vehicleId = vSnapshot.docs[0].id;

    // Obtener TODAS las tenencias del vehículo
    const tSnapshot = await collections.vehicleTenencias
      .where('vehicle_id', '==', vehicleId)
      .get();

    if (tSnapshot.empty) {
      return [];
    }

    // Ordenar por año descendente (más reciente primero)
    const tenencias = tSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));

    return tenencias;
  },

  getAllVehiclesForScraping: async () => {
    const vSnapshot = await collections.vehicles.get();
    const results = [];

    for (const vDoc of vSnapshot.docs) {
      const v = vDoc.data();
      let email = '';
      let fcm_token = null;

      if (v.user_id) {
        try {
          const uDoc = await collections.users.doc(String(v.user_id)).get();
          if (uDoc.exists) {
            const uData = uDoc.data();
            email = uData.email || '';
            fcm_token = uData.fcm_token || null;
          }
        } catch (uErr) {
          // Continuar con otros
        }
      }

      results.push({
        vehicle_id: vDoc.id,
        user_id: v.user_id,
        plate: v.plate,
        state: v.state,
        brand: v.brand,
        model: v.model,
        year: v.year,
        email,
        fcm_token
      });
    }

    return results;
  }
};

module.exports = VehicleModel;
