import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// --- FIREBASE INIT ---
let app;
let db;
let auth;
let isFirebaseConfigured = false;

try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    isFirebaseConfigured = true;

    // Validate connection to Firestore as per integration guidelines
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or internet connection.");
        }
      }
    };
    testConnection();
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

// --- HELPERS ---
const isAdmin = () => {
  return auth?.currentUser?.email === 'jose.erquiaga@gmail.com';
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (!isFirebaseConfigured) {
    console.error("Firebase not configured. Error suppressed.");
    return;
  }
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Show user-friendly alert for permission errors
  if (errMessage.includes('permission-denied') || errMessage.includes('insufficient permissions')) {
    alert(`Error de permisos en ${path} (${operationType}). Verifica si tu email tiene acceso.`);
  }

  throw new Error(JSON.stringify(errInfo));
}

export { app, db, auth, isFirebaseConfigured, googleProvider, isAdmin, handleFirestoreError };
