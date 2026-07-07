# Migrar ERKIALE a otra cuenta de Google

Guía para mover la app (Firebase + Gemini) a otra cuenta de Google. Cubre qué se hace desde la consola de Google (fuera del código) y qué archivos del repo hay que tocar.

> **Julio 2026:** Ya se ejecutó una migración real, proyecto `erkiale-9459d` de `jose.erquiaga@gmail.com` a `erkialesl@gmail.com`, usando la **Opción A** (mismo proyecto, nuevo propietario vía IAM). No se creó proyecto nuevo ni se tocó `firebase-applet-config.json`.

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

El OCR de facturas (`src/services/geminiService.ts` → `scanExpenseInvoice`) **ya no llama a Gemini directamente desde el cliente**. Llama a una Cloud Function (`analyzeReceipt`) que recupera la API key desde Secret Manager server-side, así la key nunca se expone en el bundle del navegador.

- La key vive en Secret Manager como secret `gemini-api-key`, en el proyecto `erkiale-9459d`.
- Para regenerarla con la cuenta nueva: crea una key nueva en [aistudio.google.com](https://aistudio.google.com/) con la cuenta nueva, y actualiza el secret:
  ```bash
  echo -n "NUEVA_API_KEY" | gcloud secrets versions add gemini-api-key \
    --data-file=- --project=erkiale-9459d
  ```
- No hace falta tocar `.env.local` ni `vite.config.ts` — la key no pasa por el build del frontend.
- Si migras a un proyecto GCP nuevo (Opción B), hay que recrear el secret ahí y volver a desplegar la Cloud Function (ver `CLAUDE.md`, sección "Escaneo de Facturas con Gemini Vision").

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
- [ ] Generar API key de Gemini nueva y actualizar el secret `gemini-api-key` en Secret Manager (`gcloud secrets versions add`)
- [ ] Desplegar hosting con `firebase deploy --project <project-id>`
- [ ] Verificar dominio propio (si aplica)
