# AUTOCONTROL - Keystore & Signing Configuration

> Siguiendo el patrón de jr_mobile: credenciales externas al proyecto

---

## 📍 Ubicación del Keystore

**Directorio:** `C:\Users\chiva\.autocontrol-keys\`

**Archivos:**
- `autocontrol-release.jks` - Keystore firmado (RSA 2048)
- `keystore.properties` - Credenciales de firma

```
C:\Users\chiva\.autocontrol-keys\
├── autocontrol-release.jks
└── keystore.properties
```

---

## 🔑 Credenciales de Firma

**Archivo:** `C:\Users\chiva\.autocontrol-keys\keystore.properties`

```properties
storeFile=C:/Users/chiva/.autocontrol-keys/autocontrol-release.jks
storePassword=<TU_CONTRASEÑA>
keyAlias=autocontrol
keyPassword=<TU_CONTRASEÑA>
```

---

## ✅ Detalles del Keystore

```
Alias: autocontrol
Tipo: RSA
Tamaño: 2048-bit
Validez: 10,000 días (27 años aproximadamente)
Algoritmo de firma: SHA256withRSA
Common Name: AutoControl México
Organization: AutoControl
Organization Unit: Development
City: Mexico City
State: CDMX
Country: MX
```

---

## 🔧 Cómo se Usa

### Con EAS Build (Expo)

EAS Build usa las credenciales del keystore automáticamente durante el build:

```bash
cd vehicle-app
eas build --platform android --profile production
```

El archivo `eas.json` especifica la ruta:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "keystorePath": "C:/Users/chiva/.autocontrol-keys/autocontrol-release.jks",
        "keystorePassword": "<TU_CONTRASEÑA>",
        "keyAlias": "autocontrol",
        "keyPassword": "<TU_CONTRASEÑA>"
      }
    }
  }
}
```

### Local Build (si se necesita)

```bash
# Android CLI (si se hace build local sin EAS)
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=C:/Users/chiva/.autocontrol-keys/autocontrol-release.jks \
  -Pandroid.injected.signing.store.password=<TU_CONTRASEÑA> \
  -Pandroid.injected.signing.key.alias=autocontrol \
  -Pandroid.injected.signing.key.password=<TU_CONTRASEÑA>
```

---

## 🔒 Seguridad

✅ **Keystore NO está en el repositorio** - Protegido por `.gitignore`
✅ **Credenciales NO están en el repositorio** - Almacenadas en HOME externo
✅ **NUNCA comitear** - El directorio `.autocontrol-keys` está fuera del proyecto
✅ **Acceso local** - Solo el desarrollo local accede a estas credenciales

---

## 📝 Monitoreo

### Verificar que keystore NO está en git

```bash
cd G:\dev\devMGM\vehicle-mgm
git ls-files | grep -i keystore  # No debería devolver nada
git status | grep keystore        # No debería devolver nada
```

### Verificar que archivo está en .gitignore

```bash
cat vehicle-app/.gitignore | grep keystore
# Debe mostrar: *.keystore y *.jks
```

---

## 🔄 Backup

**⚠️ IMPORTANTE:** Hacer backup del keystore en lugar seguro

```
Locación: C:\Users\chiva\.autocontrol-keys\autocontrol-release.jks
Backup recomendado: Google Drive, OneDrive, o almacenamiento seguro
Notas: Pérdida de este archivo = no poder firmar updates de la app en Play Store
```

---

## 🚀 Próximos Pasos

1. **EAS Build:** Ejecutar `eas build --platform android --profile production`
2. **Esperar ~15 min** para que compile en servidores Expo
3. **Descargar APK** desde link que da EAS
4. **Instalar en dispositivo/emulador** con `adb install`

---

## 📖 Referencias

- [EAS Build Documentation](https://docs.expo.dev/build/setup/)
- [Android Signing Configuration](https://developer.android.com/studio/publish/app-signing)
- [Keystore Management](https://developer.android.com/studio/publish/app-signing#secure-key)

