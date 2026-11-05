# Deploy API a Supabase + Railway.app

## Parte 1: Configurar Supabase PostgreSQL

### 1.1 Crear Proyecto en Supabase
```
1. Ir a: https://supabase.com
2. Click "New Project"
3. Nombre: vehicle-mgm
4. Password: (genera uno fuerte)
5. Region: South America (São Paulo)
6. Esperar 2-3 minutos
```

### 1.2 Obtener Connection String
```
1. En Supabase Dashboard, ir a: Settings → Database
2. Copiar "Connection string" (URI)
3. Reemplazar [YOUR-PASSWORD] con tu password
4. Debe verse así:
   postgresql://postgres.xxxxx:password@xxxxx.supabase.co:5432/postgres
```

### 1.3 Agregar a .env.production
```env
DATABASE_URL=postgresql://postgres.xxxxx:password@xxxxx.supabase.co:5432/postgres
```

---

## Parte 2: Deploy con Railway.app (RECOMENDADO)

### 2.1 Crear Cuenta en Railway
```
1. Ir a: https://railway.app
2. Click "Start Free" (GitHub login)
3. Conectar tu cuenta de GitHub
```

### 2.2 Crear Nuevo Proyecto desde Git
```
1. En Dashboard, click "New Project"
2. Seleccionar "Deploy from GitHub"
3. Buscar: vehicle-mgm
4. Seleccionar el repositorio
5. Seleccionar rama: main (o tu rama actual)
```

### 2.3 Configurar Servicio Node.js
```
1. Railway automáticamente detectará package.json
2. Ir a Settings → Port: debe ser 3000
3. Agregar variables de entorno:
   - DATABASE_URL (copiar de Supabase)
   - FIREBASE_SERVICE_ACCOUNT_PATH (ver abajo)
   - JWT_SECRET (generar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   - FRONTEND_URL (tu app Expo URL)
   - NODE_ENV=production
```

### 2.4 Agregar Firebase Service Account
**Opción A: Via Variables de Entorno**
```
1. Abrir firebase-service-account.json localmente
2. Copiar TODO el contenido JSON
3. En Railway, crear variable: FIREBASE_SERVICE_ACCOUNT_JSON
4. Pegar el contenido JSON
5. En server.js, parsear la variable:
   const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
   admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
```

**Opción B: Via File (recomendado)**
```bash
# En tu repo, agregar el archivo (sin commitar)
echo '{"type":"service_account",...}' > vehicle-backend/src/config/firebase-service-account.json
git add -f vehicle-backend/src/config/firebase-service-account.json
git commit -m "chore: firebase service account (skip in prod)"

# En .gitignore, comentar esta línea solo para CI/CD
# src/config/firebase-service-account.json
```

### 2.5 Configurar Cron Job del Scraper
```
En Railway NO puedes ejecutar cron jobs directamente.
Alternativa: Usar https://cron-job.org (GRATUITO)

1. Ir a: https://cron-job.org
2. Click "Create cronjob"
3. URL: https://tu-app-en-railway.app/api/scraper/run
4. Schedule: Todos los días a las 08:00 AM (UTC-5, Mexico City)
5. Salvar
```

### 2.6 Deploy Automático
```
1. Cada vez que hagas push a main:
   git add .
   git commit -m "feat: actualización"
   git push origin main

2. Railway automáticamente:
   - Descarga el código
   - npm install
   - npm start
   - Despliega la app
   - El endpoint estará en: https://[tu-proyecto]-production.up.railway.app
```

---

## Parte 3: Crear Endpoint de Scraper Manual

En `vehicle-backend/src/routes/scraperRoutes.js`, agregar:

```javascript
router.post('/run', async (req, res) => {
  try {
    const result = await runPythonScraper();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
```

---

## Parte 4: Verificar Deploy

```bash
# Test que el servidor está corriendo
curl https://tu-app-en-railway.app/health

# Respuesta esperada:
{
  "status": "ok",
  "service": "AutoControl México - Backend API"
}

# Test de auth
curl -X POST https://tu-app-en-railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## Parte 5: Actualizar Frontend (React Native)

En `vehicle-app/src/services/api.js`:

```javascript
const API_URL = 'https://tu-app-en-railway.app';

// El resto queda igual
```

En `app.json`:
```json
{
  "extra": {
    "apiUrl": "https://tu-app-en-railway.app"
  }
}
```

---

## Checklist de Deploy

- [ ] Supabase proyecto creado
- [ ] Connection string de PostgreSQL en .env.production
- [ ] Railway proyecto creado
- [ ] Variables de entorno en Railway configuradas
- [ ] Firebase service account en Railway
- [ ] Cron job configurado en cron-job.org
- [ ] Endpoint /health responde correctamente
- [ ] Auth endpoint funciona
- [ ] Frontend conecta a la API en producción
- [ ] Scraper corre exitosamente a las 8:00 AM

---

## Troubleshooting

**Error: "Cannot connect to PostgreSQL"**
- Verificar DATABASE_URL es correcto
- En Supabase, ir a: Settings → Database → Allowed IP Addresses
- Agregar: 0.0.0.0/0 (permite cualquier IP)

**Error: "Firebase not initialized"**
- Verificar firebase-service-account.json existe
- Verificar FIREBASE_SERVICE_ACCOUNT_PATH es correcto
- En modo dev sin Firebase, logs mostrarán "[FCM] Modo simulación"

**Scraper no corre a las 8:00 AM**
- Verificar cron-job.org está configurado
- Probar manualmente: curl https://tu-app/api/scraper/run
- Ver logs en Railway Dashboard

