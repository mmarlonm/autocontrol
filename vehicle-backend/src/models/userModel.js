const { db, admin, collections } = require('../config/database');

const UserModel = {
  create: async (email, passwordHash) => {
    const cleanEmail = email.toLowerCase().trim();
    const nowIso = new Date().toISOString();

    const docRef = await collections.users.add({
      email: cleanEmail,
      password_hash: passwordHash,
      fcm_token: null,
      created_at: nowIso,
      updated_at: nowIso,
      server_created_at: admin.firestore.FieldValue.serverTimestamp(),
      server_updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      id: docRef.id,
      email: cleanEmail,
      fcm_token: null,
      created_at: nowIso,
      updated_at: nowIso
    };
  },

  findByEmail: async (email) => {
    const cleanEmail = email.toLowerCase().trim();
    const snapshot = await collections.users.where('email', '==', cleanEmail).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      ...data
    };
  },

  findById: async (id) => {
    if (!id) return null;
    const doc = await collections.users.doc(String(id)).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      fcm_token: data.fcm_token || null,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  updateFcmToken: async (userId, token) => {
    const nowIso = new Date().toISOString();
    await collections.users.doc(String(userId)).set({
      fcm_token: token,
      updated_at: nowIso,
      server_updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return UserModel.findById(userId);
  },

  clearInvalidFcmToken: async (invalidToken) => {
    const snapshot = await collections.users.where('fcm_token', '==', invalidToken).get();
    if (snapshot.empty) {
      return { changes: 0 };
    }

    const batch = db.batch();
    const nowIso = new Date().toISOString();

    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        fcm_token: null,
        updated_at: nowIso,
        server_updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    return { changes: snapshot.size };
  }
};

module.exports = UserModel;
