# Deploy API a Railway.app (PASO A PASO)

## ✅ Lo que ya está hecho:
- ✅ Supabase PostgreSQL inicializado
- ✅ Tablas creadas (users, vehicles, vehicle_tenencias, notifications)
- ✅ .env.production configurado
- ✅ Firebase service account en lugar

---

## 🚀 Deploy a Railway.app

### PASO 1: Crear Cuenta en Railway

1. Ir a: https://railway.app
2. Click "Start Free"
3. Hacer login con **GitHub** (recomendado)
4. Autorizar a Railway a acceder a tu GitHub

### PASO 2: Conectar tu Repositorio

1. En Railway Dashboard, click "New Project"
2. Seleccionar "Deploy from GitHub Repo"
3. Buscar y seleccionar: `vehicle-mgm`
4. Autorizar a Railway a acceder al repo
5. Seleccionar rama: `main` (o tu rama actual)
6. Click "Deploy"

**⏳ Esperar a que Railway cree el servicio (2-3 minutos)**

### PASO 3: Agregar Variables de Entorno

Una vez que Railway termina de crear el proyecto:

1. En Railway Dashboard, ver tu proyecto "vehicle-mgm"
2. Click en el servicio "vehicle-backend" (o similar)
3. Ir a pestaña "Variables"
4. Click "+ New Variable"
5. **Agregar estas variables:**

```
DATABASE_URL = postgresql://postgres:LHLPJuXvIyf3TZCg@db.vsnqtjqnmbzgoztkmalr.supabase.co:5432/postgres
NODE_ENV = production
JWT_SECRET = supersecretjwtkey_autocontrol_mexico_2026_production
PYTHON_PATH = python3
SCRAPER_SCRIPT_PATH = ./scrapers/main.py
CRON_SCHEDULE = 0 8 * * *
FIREBASE_SERVICE_ACCOUNT_PATH = ./src/config/firebase-service-account.json
FRONTEND_URL = https://tu-app-expo.dev
```

### PASO 4: Agregar Firebase Service Account

**Opción A: Copiar JSON como variable (RECOMENDADO)**

1. Abre localmente: `vehicle-backend/src/config/firebase-service-account.json`
2. Copia TODO el contenido (es un JSON muy largo)
3. En Railway, agregar variable:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value:** Pega todo el JSON
4. Guardar

4b. Editar `vehicle-backend/src/config/database.js` para leer esta variable:

```javascript
if (fs.existsSync(serviceAccountPath)) {
  // ... código existente ...
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Leer del environment variable (para Railway)
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  // ...
}
```

### PASO 5: Esperar Deploy

1. Railway automáticamente:
   - Descarga el código
   - Ejecuta `npm install`
   - Ejecuta `npm start`
   - Despliega en un servidor

2. Ver logs en Railway Dashboard para verificar que todo corre bien

3. **Tu URL será:**
   ```
   https://vehicle-mgm-production.up.railway.app
   (o algo similar que Railway te asigne)
   ```

### PASO 6: Verificar que funciona

```bash
# Test endpoint de salud
curl https://vehicle-mgm-production.up.railway.app/health

# Respuesta esperada:
{
  "status": "ok",
  "service": "AutoControl México - Backend API",
  "time": "2026-11-05T22:00:00Z"
}

# Test signup
curl -X POST https://vehicle-mgm-production.up.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# Respuesta esperada:
{
  "success": true,
  "message": "Usuario registrado exitosamente.",
  "data": {
    "user": { "id": 1, "email": "test@example.com" },
    "token": "eyJhbGc..."
  }
}
```

### PASO 7: Configurar Cron Job (Scraper a las 8 AM)

El scraper Python corre automáticamente a las 8 AM vía cron-job.org:

1. Ir a: https://cron-job.org
2. Click "Login" (o crear cuenta free)
3. Click "Create cronjob"
4. Configurar:
   - **URL:** `https://vehicle-mgm-production.up.railway.app/api/scraper/run`
   - **Schedule:** Daily, 08:00 AM UTC-5 (Mexico City)
   - **Notification email:** tu-email@example.com
5. Guardar

⚠️ **Si Railway no tiene endpoint `/api/scraper/run`:**
- Crear en `vehicle-backend/src/routes/scraperRoutes.js`:
```javascript
router.post('/run', async (req, res) => {
  const result = await runPythonScraper();
  res.json({ success: true, result });
});
```

### PASO 8: Actualizar Frontend App

En `vehicle-app/src/services/api.js`:

```javascript
const API_URL = 'https://vehicle-mgm-production.up.railway.app';

// El resto del código queda igual
```

En `vehicle-app/app.json`:
```json
{
  "extra": {
    "eas": {
      "projectId": "tu-eas-project-id"
    },
    "apiUrl": "https://vehicle-mgm-production.up.railway.app"
  }
}
```

---

## 🔍 Troubleshooting

### Error: "Cannot connect to PostgreSQL"
```
Solución:
1. Verificar DATABASE_URL es correcto
2. En Supabase Dashboard → Settings → Database → Firewall
3. Agregar IP: 0.0.0.0/0 (permite todas)
```

### Error: "Firebase not initialized"
```
Solución:
1. Verificar que FIREBASE_SERVICE_ACCOUNT_JSON está agregado
2. Verificar que es JSON válido (sin saltos de línea extras)
3. En modo dev, FCM usa simulador - ver logs
```

### Scraper no corre a las 8 AM
```
Solución:
1. Verificar cron-job.org está configurado
2. Probar manualmente:
   curl -X POST https://vehicle-mgm-production.up.railway.app/api/scraper/run
3. Ver logs en Railway Dashboard
```

### "Port 3000 is already in use"
```
Solución: Railway automáticamente asigna un puerto diferente
- No necesitas cambiar nada
- El puerto aparece en los logs
```

---

## ✅ Checklist Final

- [ ] Cuenta creada en https://railway.app
- [ ] GitHub conectado a Railway
- [ ] Repositorio vehicle-mgm desplegado
- [ ] Variables de entorno agregadas
- [ ] Firebase service account configurado
- [ ] Endpoint /health responde correctamente
- [ ] Auth endpoint (signup) funciona
- [ ] Supabase BD tiene datos de prueba
- [ ] Cron job configurado en cron-job.org
- [ ] Frontend conecta a API en producción
- [ ] Scraper corre exitosamente a las 8 AM

---

## 📝 URLs Finales

```
API Backend:     https://vehicle-mgm-production.up.railway.app
Supabase DB:     db.vsnqtjqnmbzgoztkmalr.supabase.co
Cron Job:        https://cron-job.org
Firebase:        https://console.firebase.google.com
```

---

¿Necesitas ayuda en algún paso?
