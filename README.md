# AutoControl México 🚗🇲🇽
### App Móvil + Backend API + Scraper Python para Gestión de Tenencias Vehiculares en México

Aplicación integral de gestión vehicular para consultar tenencias, subsidios oficiales del 100%, refrendos y promociones de la Ciudad de México y Estado de México, con notificaciones Push automáticas (FCM) y sincronización programada diariamente a las 8:00 AM mediante un scraper en Python.

---

## 🏗️ Arquitectura y Stack Tecnológico

- **Frontend Móvil:** React Native con Expo SDK, React Navigation (Bottom Tabs & Native Stack), diseño Glassmorphism/Moderno con paleta Turquesa `#18b0b8` y bajo consumo de batería (no ejecuta el scraper en el dispositivo).
- **Backend API:** Node.js + Express, SQLite3 con `node-cron`, JsonWebToken (JWT) y bcryptjs.
- **Scraper:** Python 3 + BeautifulSoup4 + Requests con tolerancia a fallos multi-portal (CDMX y Edomex).
- **Notificaciones:** Firebase Cloud Messaging (FCM) con detección y remoción automática de tokens inválidos.
- **Automatización:** Cron programado exactamente a las **8:00 AM** (`0 8 * * *`).

---

## 📋 Validación de Requerimientos Críticos

| Requisito Crítico | Estado | Implementación |
| :--- | :---: | :--- |
| **UNIQUE constraint en notificaciones** | ✅ Cumplido | `CONSTRAINT uq_user_type_created UNIQUE (user_id, type, created_at)` en SQLite. Evita duplicados en base de datos. |
| **Error Handling en Scraper** | ✅ Cumplido | Arquitectura multi-portal con try/except que continúa con portales de contingencia si uno falla. |
| **Validación de Placa** | ✅ Cumplido | Expresión regular obligatoria: `/^[A-Z]{3}-\d{4}$/` (Estándar oficial mexicano `ABC-1234`). |
| **Manejo de tokens FCM inválidos** | ✅ Cumplido | `FcmService` detecta códigos de desinstalación/invalidez y limpia automáticamente el token en `users`. |
| **Cron Job a las 8:00 AM** | ✅ Cumplido | `cron.schedule('0 8 * * *')` ejecutando el subproceso Python de scraping. |
| **Regla de Negocio MVP** | ✅ Cumplido | Una placa por usuario (`UNIQUE(user_id)` en tabla `vehicles`). |

---

## 🚀 Guía de Inicio Rápido

### 1. Iniciar el Backend
```bash
cd vehicle-backend
npm install
npm start
```
El servidor arrancará en `http://localhost:3000`.

### 2. Iniciar la App Móvil (Expo)
```bash
cd vehicle-app
npm install
npx expo start
```
Presiona `a` para emulador Android, `i` para simulador iOS, o `w` para explorador Web.

### 3. Ejecutar Scraper Manualmente
```bash
cd vehicle-backend
python scrapers/main.py --plate ABC-1234
```

### 4. Ejecutar Suite Completa de Pruebas Automatizadas
```bash
cd vehicle-backend
npm test
```
Ejecuta la suite unitaria (`test/backend.test.js`) y la suite HTTP End-to-End (`test/api.test.js`).
