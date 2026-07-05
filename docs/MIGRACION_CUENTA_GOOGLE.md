# Migrar ERKIALE a otra cuenta de Google

Guía para mover la app (Firebase + Gemini) a otra cuenta de Google. Cubre qué se hace desde la consola de Google (fuera del código) y qué archivos del repo hay que tocar.

## 1. Firebase (proyecto)

El proyecto actual es `erkiale-9459d` (ver `firebase-applet-config.json`). Dos opciones:

- **Opción A — mismo proyecto, nuevo administrador:** en Firebase Console → Configuración del proyecto → Usuarios y permisos, añade la cuenta nueva como "Propietaria". No requiere cambios en el repo.
- **Opción B — proyecto nuevo:** crea un proyecto Firebase bajo la cuenta nueva con Authentication (Google Sign-In) y Firestore habilitados, y migra los datos:
  ```bash
  # Exportar del proyecto viejo (requiere plan Blaze)
  gcloud firestore export gs://<bucket-temporal> --project=erkiale-9459d
  # Importar al proyecto nuevo
  gcloud firestore import gs://<bucket-temporal> --project=<proyecto-nuevo>
  ```
  Esto migra `projects/`, `catalogs/` y `settings/` tal cual.

## 2. Config de Firebase en el código

Si eliges la Opción B, reemplaza `firebase-applet-config.json` (raíz del repo) con la config del proyecto nuevo (Firebase Console → Configuración del proyecto → tus apps → SDK config): `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `firestoreDatabaseId`.

## 3. Emails con acceso (whitelist hardcodeada)

El control de acceso no usa roles de Firebase, usa una whitelist de emails en el código. Hay que actualizar **ambos** sitios o la cuenta nueva no podrá entrar:

- `src/lib/firebase.ts` — función `isAdmin()`, compara con `'jose.erquiaga@gmail.com'`.
- `firestore.rules` — `isSignedIn()` permite `jose.erquiaga@gmail.com` y `milnelas77@gmail.com`; `isAdmin()` solo el primero.

Tras editar `firestore.rules`, hay que volver a desplegar las reglas:

```bash
firebase deploy --only firestore:rules
```

## 4. Gemini API key (reconocimiento de facturas)

`GEMINI_API_KEY` (usada por `src/services/geminiService.ts` para el OCR de facturas) es independiente de Firebase — se genera en Google AI Studio y pertenece a un proyecto de Google Cloud.

- Genera una key nueva en [aistudio.google.com](https://aistudio.google.com/) con la cuenta nueva.
- Actualiza `.env.local` en local (no se commitea, está en `.gitignore`).
- Actualiza la variable de entorno en el entorno de build/CI de producción, ya que se inyecta en el bundle en build-time (`vite.config.ts`).

## 5. Hosting

No hay `.firebaserc` en el repo, así que el proyecto se selecciona manualmente al desplegar:

```bash
firebase deploy --project <project-id>
```

Con proyecto nuevo, usa el ID nuevo en ese comando. Si hay dominio propio configurado, hay que volver a verificarlo/apuntarlo en el proyecto nuevo.

## Checklist rápido

- [ ] Decidir Opción A (mismo proyecto) u Opción B (proyecto nuevo + migración de datos)
- [ ] Si Opción B: reemplazar `firebase-applet-config.json`
- [ ] Actualizar emails en `src/lib/firebase.ts` (`isAdmin`)
- [ ] Actualizar emails en `firestore.rules` (`isSignedIn`, `isAdmin`) y desplegar rules
- [ ] Generar `GEMINI_API_KEY` nueva y actualizarla en `.env.local` / entorno de build
- [ ] Desplegar hosting con `firebase deploy --project <project-id>`
- [ ] Verificar dominio propio (si aplica)
