# Deploy AUTOCONTROL Backend a Render.com

## 📋 Requisitos Previos

✅ Código en GitHub (vehicle-mgm)
✅ Supabase PostgreSQL inicializado
✅ Firebase Service Account JSON descargado
✅ Cuenta de GitHub (para Render)

---

## 🚀 PASOS PARA RENDER.COM

### **PASO 1: Crear cuenta en Render**

1. Ir a: https://render.com
2. Click "Sign up"
3. Conectar con GitHub
4. Autorizar a Render a acceder a tus repos

---

### **PASO 2: Crear nuevo Web Service**

1. En Dashboard, click "New +"
2. Seleccionar "Web Service"
3. Conectar repositorio:
   - Buscar: `vehicle-mgm`
   - Seleccionar repo
   - Autorizar

4. Configurar el servicio:
   - **Name:** `autocontrol-api`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free` (o Paid si quieres)

5. Click "Create Web Service"

⏳ **Esperar 5-10 minutos mientras Render despliega**

---

### **PASO 3: Agregar Variables de Entorno**

Una vez que Render crea el servicio:

1. En Dashboard, click en tu servicio "autocontrol-api"
2. Ir a pestaña "Environment"
3. Click "Add Environment Variable"
4. Agregar estas 8 variables:

```
DATABASE_URL = postgresql://postgres:<PASSWORD>@db.vsnqtjqnmbzgoztkmalr.supabase.co:5432/postgres

NODE_ENV = production

JWT_SECRET = supersecretjwtkey_autocontrol_mexico_2026_production

FIREBASE_SERVICE_ACCOUNT_PATH = ./src/config/firebase-service-account.json

PYTHON_PATH = python3

SCRAPER_SCRIPT_PATH = ./scrapers/main.py

CRON_SCHEDULE = 0 8 * * *

FRONTEND_URL = https://autocontrol-mexico.expo.dev
```

5. Click "Add" después de cada variable

---

### **PASO 4: Agregar Firebase Service Account JSON**

⚠️ **En Render, no puedes pasar JSON directamente como variable (límite de caracteres)**

**Opción A: Guardar en repositorio (NO RECOMENDADO)**
```
⚠️ Riesgoso: expones credenciales en GitHub
```

**Opción B: Cargar archivo en Render (RECOMENDADO)**
```
1. En Render, ir a Settings
2. Buscar "Deploy Hooks" o "Environment"
3. Crear un script que carga el archivo antes de iniciar
```

**Opción C: Usar Secret Files en Render**
```
1. En Render, ir a "Environment"
2. Ir a sección "Secret Files"
3. Filename: `/src/config/firebase-service-account.json`
4. Contents: [Pega TODO el JSON]
5. Click "Add"
```

✅ **Usa Opción C (Secret Files)**

---

### **PASO 5: Verificar Deploy**

Render automáticamente:
- Descarga código
- `npm install`
- `npm start`
- Despliega en servidor

**Tu URL será algo como:**
```
https://autocontrol-api.onrender.com
```

Verificar que funciona:
```bash
curl https://autocontrol-api.onrender.com/health

# Respuesta esperada:
{
  "status": "ok",
  "service": "AutoControl México - Backend API"
}
```

---

### **PASO 6: Actualizar Frontend con nueva URL**

Una vez tengas la URL de Render, actualizar:

**Archivo:** `vehicle-app/src/services/api.js`

```javascript
const DEV = __DEV__;
const DEFAULT_HOST = DEV
  ? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
  : 'https://autocontrol-api.onrender.com'; // Cambiar aquí

export const API_BASE_URL = `${DEFAULT_HOST}/api`;
```

Luego commit y push:
```bash
git add vehicle-app/src/services/api.js
git commit -m "chore: update API URL to Render production endpoint"
git push origin main
```

---

## ⚙️ CONFIGURACIÓN ESPECIAL PARA RENDER

### **1. Node.js Version**
```
En Render, asegúrate que tienes Node 18+ configurado
Settings → General → Node Version → 18.x o 20.x
```

### **2. Python para Scraper**
```
⚠️ IMPORTANTE: Render trae Python 3.9+ por defecto
Si necesitas versión específica:
Settings → Build & Deploy → Build Command:
  npm install && pip install -r vehicle-backend/scrapers/requirements.txt
```

### **3. Cron Job (igual que Railway)**
```
Usar cron-job.org para ejecutar a las 8 AM:
URL: https://autocontrol-api.onrender.com/api/scraper/run
```

---

## 🆚 RENDER vs RAILWAY

| Característica | Render | Railway |
|---------------|--------|---------|
| **Setup** | 5 minutos | 5 minutos |
| **Free Tier** | ✅ Sí | ✅ Sí |
| **Variables** | UI fácil | UI fácil |
| **Secret Files** | ✅ Sí (mejor para JSON) | ❌ No |
| **Precio** | $7/mes (paid tier) | $5/mes (paid tier) |
| **Downtime** | Spin down si inactivo | No |
| **Perfs** | Buenas | Excelentes |

---

## 📝 RESUMEN DE PASOS

```
1. Ir a render.com
2. Sign up con GitHub
3. New Web Service → vehicle-mgm
4. Configurar: Name, Build, Start commands
5. Agregar 8 variables de entorno
6. Agregar Firebase JSON en Secret Files
7. Esperar a que desplegue (5-10 min)
8. Verificar con /health
9. Actualizar API URL en frontend
10. Commit y push
```

---

## 🔗 URLs FINALES

```
API Backend:      https://autocontrol-api.onrender.com
Supabase DB:      db.vsnqtjqnmbzgoztkmalr.supabase.co
Cron Job:         https://cron-job.org
Firebase:         https://console.firebase.google.com
```

---

## ✅ CHECKLIST

- [ ] Crear cuenta en Render.com
- [ ] Conectar GitHub a Render
- [ ] Create Web Service from vehicle-mgm
- [ ] Configurar Build & Start commands
- [ ] Agregar 8 variables de entorno
- [ ] Agregar Firebase JSON en Secret Files
- [ ] Esperar a que desplegue (5-10 min)
- [ ] Verificar /health endpoint
- [ ] Actualizar API URL en frontend
- [ ] Commit y push
- [ ] ✅ AUTOCONTROL Backend en Render

---

**¿Empezamos con Render ahora?**
