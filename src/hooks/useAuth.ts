import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, isFirebaseConfigured, googleProvider } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthReady(true); // Still ready to show "Not Configured" state
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      alert("Configuración de Firebase no detectada. Por favor, completa el proceso de configuración en el chat.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      alert("Error al entrar: " + (error.message || "Error desconocido"));
    }
  };

  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  return { user, authReady, handleLogin, handleLogout };
}
