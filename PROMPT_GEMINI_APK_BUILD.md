# PROMPT PARA GEMINI - Generar APK Firmada con EAS Build

## CONTEXTO

**Proyecto:** AUTOCONTROL - Vehicle Management App
**Objetivo:** Crear APK firmada para Android usando Expo EAS Build
**Estado:** Backend en Render.com (https://autocontrol-api-hmk0.onrender.com)

---

## TAREA PARA GEMINI

Configurar y ejecutar el build de la APK firmada para Android usando EAS Build.

### Archivos Disponibles

1. **~/.autocontrol-keys/autocontrol-release.jks** - Keystore (RSA 2048, válido 10,000 días) 
2. **~/.autocontrol-keys/keystore.properties** - Credenciales de firma
3. **vehicle-app/app.json** - Configuración de la app Expo
4. **vehicle-app/package.json** - Dependencias
5. **vehicle-app/eas.json** - Configuración EAS Build (será creado)

### Datos del Keystore (almacenado en HOME externo)

```
📍 Path: C:\Users\chiva\.autocontrol-keys\autocontrol-release.jks
🔑 Alias: autocontrol
🔑 Store Password: <TU_CONTRASEÑA>
🔑 Key Password: <TU_CONTRASEÑA>
✅ Validity: 10,000 days (~ 27 años)
🔐 Algorithm: RSA 2048-bit
👤 Common Name: AutoControl México

⚠️ IMPORTANTE: El keystore está FUERA del proyecto en C:\Users\chiva\.autocontrol-keys\
         (Siguiendo el patrón de jr_mobile)
```

### Configuración de la App

```json
{
  "name": "AutoControl México",
  "package": "com.autocontrol.mexico",
  "version": "1.0.0",
  "versionCode": 1,
  "slug": "auto-control-mexico"
}
```

---

## PASOS A EJECUTAR

### 1. Instalar EAS CLI y login

```bash
cd vehicle-app
npm install -g eas-cli
eas login
```

⚠️ **NOTA:** Pedir al usuario que haga `eas login` si no está hecho (requiere cuenta Expo)

### 2. Verificar configuración EAS

```bash
eas build:configure
```

Si pregunta por platform, seleccionar: **Android**
Si pregunta por build type: **APK** (no AAB)

### 3. Crear archivo eas.json (o verificar que existe)

Crear `vehicle-app/eas.json` con:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "preview2": {
      "android": {
        "buildType": "apk"
      }
    },
    "preview3": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  },
  "cli": {
    "version": ">= 5.0.0"
  }
}
```

### 4. Generar APK Firmada (opción A - con EAS Build en la nube)

**IMPORTANTE:** Este es el método recomendado

```bash
cd vehicle-app
eas build --platform android --profile production
```

**Alternativa (opción B - build local):**

```bash
eas build --platform android --local
```

⏳ **Tiempo estimado:** 10-15 minutos (nube) o 20-30 minutos (local)

**Resultado esperado:**
- Link directo para descargar APK
- APK firmada y lista para instalar en dispositivo/emulador

### 5. Guardar APK en proyecto (después de download)

```bash
mkdir -p ./build/apk
# Copiar APK descargado a ./build/apk/
# mv ~/Downloads/autocontrol-*.apk ./build/apk/autocontrol-v1.0.0-release.apk
```

### 6. Verificar APK

```bash
# En Windows (con Android SDK):
adb install ./build/apk/autocontrol-v1.0.0-release.apk

# O usar emulador Android de Android Studio
```

---

## CHECKLIST ANTES DE BUILD

- [ ] API URL en `vehicle-app/src/services/api.js` = `https://autocontrol-api-hmk0.onrender.com`
- [ ] Firebase inicializado en `vehicle-app/App.js`
- [ ] app.json tiene versión correcta (`1.0.0`)
- [ ] package.json tiene todas las dependencias (expo, react-native, firebase, etc.)
- [ ] autocontrol-release.keystore existe en vehicle-app/
- [ ] autocontrol-keystore-config.json existe en vehicle-app/
- [ ] .gitignore incluye *.keystore y autocontrol-keystore-config.json
- [ ] Usuario hizo `eas login` con cuenta Expo

---

## IMPORTANTE

### ⚠️ No exponer credenciales

```bash
# Verificar que keystore NO está en git
git status
# No debe aparecer autocontrol-release.keystore
```

### 🔐 Credenciales del Keystore

Guardar en LUGAR SEGURO (no en repo):
```
🔑 Store Password: <TU_CONTRASEÑA>
🔑 Key Password: <TU_CONTRASEÑA>
🔑 Alias: autocontrol
```

---

## DESPUÉS DE BUILD

1. **Descargar APK** desde link que da EAS
2. **Instalar en dispositivo/emulador**
3. **Testing:**
   - Abrir app
   - Login / Register
   - Registrar vehículo
   - Revisar que API (Render) funciona
   - Revisar que Firebase Firestore trae datos
   - Probar notificaciones

---

## INSTRUCCIONES FINALES PARA GEMINI

```
EJECUTA EXACTAMENTE ESTO:

1. cd vehicle-app
2. npm install -g eas-cli (si no está instalado)
3. eas login (user debe hacer esto si no está logged in)
4. eas build:configure (si eas.json no existe)
5. Crear eas.json si no existe (copiar del prompt)
6. Ejecutar: eas build --platform android --profile production
7. Esperar a que termine (10-15 min)
8. Responder con el LINK DE DESCARGA DE LA APK
9. Hacer commit de cambios: git add app/ eas.json && git commit -m "build: configure EAS for Android APK build"
10. Responder cuando termines
```

---

**IMPORTANTE:** El usuario debe hacer `eas login` una sola vez en su cuenta Expo. Si ya lo hizo, simplemente ejecutar el build.

