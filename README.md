# Ruta SAA-C03

App de estudio para el examen **AWS Certified Solutions Architect – Associate (SAA-C03)**: una ruta de mundos estilo Duolingo, un motor local que genera y explica preguntas, un glosario de 415 términos y, cuando fallas, la comparación entre lo que elegiste y la respuesta correcta.

## Dónde usarla

| Plataforma | Cómo | Actualizaciones |
|---|---|---|
| **Web** | La URL de Amplify Hosting | Automáticas (service worker) |
| **iPhone / iPad** | Abre la web en Safari → Compartir → *Agregar a pantalla de inicio* | Automáticas |
| **Android** | `Ruta-SAA-C03.apk` desde [Releases](https://github.com/Anedre/ruta-saa-c03/releases/latest) | La app avisa y lleva a la descarga |
| **Windows** | `Ruta-SAA-C03-Setup-x.y.z.exe` desde [Releases](https://github.com/Anedre/ruta-saa-c03/releases/latest) | Automáticas: se descargan solas y se instalan al cerrar |

Windows y Android pueden advertir que el instalador no está firmado o que viene de fuera de la tienda: en Windows, *Más información → Ejecutar de todas formas*; en Android, permite instalar apps desde el navegador.

Con una **cuenta** (registro con correo) el progreso se guarda en la nube y se sincroniza entre dispositivos. Sin cuenta, todo queda en el dispositivo.

## Arquitectura

- **Una sola base de código** en `src/` (HTML, CSS y JavaScript sin framework) para las cuatro plataformas:
  - Windows: Electron (`main.js`, `preload.js`), progreso en `%APPDATA%\Ruta SAA-C03\progreso-saa.json`.
  - Web e iPhone: `npm run build:web` arma `www/` (fuentes, service worker, manifiesto).
  - Android: Capacitor empaqueta `www/` en `android/`.
- **Backend Amplify Gen 2** en `amplify/`:
  - `auth`: Cognito, registro abierto con código de verificación por correo.
  - `data`: modelo `Doc` en AppSync + DynamoDB; cada documento de progreso es del usuario dueño (`allow.owner()`).
  - `cloud/cloud.js` es el cliente (Amplify JS); `scripts/build-cloud.js` lo empaqueta en `src/vendor/cloud.js` usando `amplify_outputs.json`.
- **Sincronización local primero** (`Sync` en `src/app.js`): la app siempre lee y escribe en local; con sesión, cada cambio se sube a la nube y al abrir se bajan los cambios de otros dispositivos. Ante un conflicto gana el documento modificado más recientemente. Sin conexión, los cambios esperan y se suben solos al volver.
- **Contenido de estudio**: `src/data/content.js` (temas, 155 preguntas, plan), `src/engine/` (42 decisiones del examen y generador de preguntas), `src/data/glossary.js` (glosario) y `src/data/whynot.js` (por qué cada opción incorrecta del banco no es).

## Desarrollo

```bash
npm install
npm start           # app de escritorio
npm test            # motor, glosario y explicaciones de opciones incorrectas
npm run build:web   # versión web en www/
npx cap sync android && cd android && ./gradlew assembleRelease   # APK (requiere la llave, ver abajo)
```

Para probar el login sin desplegar nada: `scripts/mock-cloud.js` simula Cognito y DynamoDB en el navegador (copia `www/` y reemplaza `vendor/cloud.js` por ese archivo).

## Publicar una versión nueva

1. Sube el número en `package.json` (por ejemplo `1.6.0`), haz commit y push a `main`. Amplify redespliega la web y el backend solo.
2. Crea y sube la etiqueta: `git tag v1.6.0 && git push origin v1.6.0`.
3. GitHub Actions (`.github/workflows/release.yml`) compila el instalador de Windows y el APK y los publica en Releases. Las apps de Windows se actualizan solas; las de Android muestran el aviso.

El APK se firma con una llave que vive **fuera del repositorio** (en tu PC y como secretos cifrados de GitHub: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Si la llave se pierde, los APK nuevos no se pueden instalar encima de los anteriores.
