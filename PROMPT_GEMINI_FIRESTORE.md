# PROMPT PARA GEMINI - Cambiar de PostgreSQL a Firebase Firestore

## CONTEXTO

**Proyecto:** AUTOCONTROL - Vehicle Management App
**Problema actual:** Render.com no soporta IPv6 para conectar a Supabase PostgreSQL
**Solución:** Migrar a Firebase Firestore (BaaS nativo de Google)

**Ventajas de Firestore:**
- ✅ Funciona perfectamente en Render.com
- ✅ No requiere servidor separado
- ✅ Escalable automáticamente
- ✅ Notificaciones en tiempo real integradas
- ✅ Ya tenemos Firebase configurado para FCM

---

## TAREA PARA GEMINI

Cambiar TODO de PostgreSQL (SQL) a Firebase Firestore (NoSQL).

### Archivos a REESCRIBIR:

1. **vehicle-backend/src/config/database.js**
   - Cambiar: const Client = require('pg') 
   - Por: Firebase Firestore admin
   - Exportar funciones para CRUD en Firestore

2. **vehicle-backend/src/models/userModel.js**
   - Cambiar: SQLite queries
   - Por: Firestore queries (add, set, get, update, where)
   - Funciones: create(email, passwordHash), findByEmail(email), getUserById(id), updateFcmToken(userId, token), clearInvalidFcmToken(token)

3. **vehicle-backend/src/models/vehicleModel.js**
   - Cambiar: SQL queries
   - Por: Firestore queries
   - Funciones: createOrUpdate(userId, vehicleData), findByUserId(userId), findByPlate(plate)

4. **vehicle-backend/src/models/notificationModel.js**
   - Cambiar: SQL INSERT/UPDATE
   - Por: Firestore set/update
   - Funciones: createNotification(userId, type, title, message), getNotificationsByUserId(userId), markAsRead(notificationId), markAllAsRead(userId)

5. **vehicle-backend/src/models/vehicleModel.js** (Agregar tabla)
   - Crear modelo para vehicle_history (similar al anterior)

6. **vehicle-backend/package.json**
   - Verificar que `firebase-admin` está (ya debería estar)
   - Remover `pg` (PostgreSQL driver)

---

## ESTRUCTURA DE FIRESTORE

```
firestore/
├── users/
│   ├── {userId}/
│   │   ├── email: string
│   │   ├── passwordHash: string
│   │   ├── fcmToken: string
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│
├── vehicles/
│   ├── {vehicleId}/
│   │   ├── userId: string (índice)
│   │   ├── plate: string (índice, único)
│   │   ├── state: string
│   │   ├── brand: string
│   │   ├── model: string
│   │   ├── year: number
│   │   ├── serialNumber: string
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│
├── vehicleTenencias/
│   ├── {tenanciaId}/
│   │   ├── vehicleId: string (índice)
│   │   ├── year: number
│   │   ├── tenenciaAmount: number
│   │   ├── subsidyAmount: number
│   │   ├── refrendoAmount: number
│   │   ├── totalDue: number
│   │   ├── dueDate: string
│   │   ├── subsidyActive: boolean
│   │   ├── subsidyCondition: string
│   │   ├── status: string
│   │   ├── promotions: string
│   │   ├── lastScrapedAt: timestamp
│
├── notifications/
│   ├── {notificationId}/
│   │   ├── userId: string (índice)
│   │   ├── type: string
│   │   ├── title: string
│   │   ├── message: string
│   │   ├── read: boolean
│   │   ├── createdAt: timestamp
│
├── vehicleHistory/
│   ├── {historyId}/
│   │   ├── vehicleId: string (índice)
│   │   ├── eventType: string
│   │   ├── eventDate: string
│   │   ├── details: string
│   │   ├── createdAt: timestamp
```

---

## DETALLES DE IMPLEMENTACIÓN

### database.js

```javascript
const admin = require('firebase-admin');

// Ya debería estar inicializado en config/firebase.js
const db = admin.firestore();

// Exportar funciones de utilidad
export async function createDocument(collection, data) {
  const docRef = await db.collection(collection).add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { id: docRef.id, ...data };
}

export async function getDocument(collection, id) {
  const doc = await db.collection(collection).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function updateDocument(collection, id, data) {
  await db.collection(collection).doc(id).update({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

export async function queryDocuments(collection, field, operator, value) {
  const snapshot = await db.collection(collection)
    .where(field, operator, value)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export { db };
```

### userModel.js (Ejemplo)

```javascript
const { db } = require('../config/database');

async function create(email, passwordHash) {
  const userRef = await db.collection('users').add({
    email,
    passwordHash,
    fcmToken: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return { id: userRef.id, email, passwordHash, fcmToken: null };
}

async function findByEmail(email) {
  const snapshot = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function getUserById(userId) {
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function updateFcmToken(userId, fcmToken) {
  await db.collection('users').doc(userId).update({ fcmToken });
  return { id: userId, fcmToken };
}

async function clearInvalidFcmToken(fcmToken) {
  const snapshot = await db.collection('users')
    .where('fcmToken', '==', fcmToken)
    .get();
  
  for (const doc of snapshot.docs) {
    await doc.ref.update({ fcmToken: null });
  }
}

module.exports = { create, findByEmail, getUserById, updateFcmToken, clearInvalidFcmToken };
```

---

## CAMBIOS EN CONTROLLERS

Los controllers seguirán igual, solo que las llamadas a BD cambiarán de:
```javascript
// Antes (SQL)
const user = await UserModel.findByEmail(email);

// Después (Firestore - igual interfaz)
const user = await UserModel.findByEmail(email);
```

La interfaz de los modelos DEBE mantenerse igual para que los controllers no cambien.

---

## CAMBIOS EN package.json

- ✅ `firebase-admin` debe estar (verificar)
- ❌ Remover `pg` (PostgreSQL driver)
- ✅ Mantener el resto igual

```json
{
  "dependencies": {
    "firebase-admin": "^11.0.0",
    // Remover: "pg": "^8.x.x"
    // Mantener resto igual
  }
}
```

---

## IMPORTANTE

1. **Mantener la misma interfaz de funciones** en los modelos para que los controllers NO cambien
2. **Usar admin.firestore.FieldValue.serverTimestamp()** para timestamps automáticos
3. **Crear índices en Firestore** para los campos que se usan en queries:
   - users: email (UNIQUE)
   - vehicles: userId (UNIQUE), plate (UNIQUE)
   - vehicleTenencias: vehicleId, year (COMPOUND UNIQUE)
   - notifications: userId, read
   - vehicleHistory: vehicleId

4. **Para evitar duplicados de notificaciones**, usar la restricción UNIQUE implícita en Firestore creando un documento con un ID basado en (userId, type, createdAt)

---

## DESPUÉS DE CAMBIOS

1. Hacer commit
2. Push a GitHub
3. Render automáticamente redesplegará
4. Firestore debe conectar correctamente en Render ✅

---

## INSTRUCCIONES FINALES PARA GEMINI

```
IMPLEMENTA EXACTAMENTE ESTO:

1. Lee este documento completamente
2. Reescribe los 5 archivos (.js) para usar Firestore en lugar de PostgreSQL
3. Mantén la interfaz de funciones IGUAL (para no cambiar controllers)
4. Cambia package.json (verificar firebase-admin, remover pg)
5. NO cambies nada más (controllers, routes, etc.)
6. Verifica que el código sea funcional (sin errores)
7. Haz commits: uno por archivo o uno general
8. Push a main
9. Responde cuando termines
```
