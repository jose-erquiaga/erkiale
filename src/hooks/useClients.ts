import { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { Client } from '../types';

export type ClientFormData = { name: string; cif: string; address: string; email: string; phone: string };

export function useClients(user: { uid: string } | null | undefined) {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;

    const clientsQuery = collection(db, 'clients');
    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      setClients(snapshot.docs.map(d => ({ ...d.data(), firebaseId: d.id } as Client)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

    return () => unsubscribe();
  }, [user]);

  const handleAddClient = async (data: ClientFormData): Promise<string | null> => {
    if (!user) return null;
    const newClient = { id: Date.now(), ...data, ownerId: user.uid };
    try {
      const ref = await addDoc(collection(db, 'clients'), newClient);
      return ref.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
      return null;
    }
  };

  const handleUpdateClient = async (firebaseId: string, data: ClientFormData) => {
    try {
      await updateDoc(doc(db, 'clients', firebaseId), data);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${firebaseId}`);
      return false;
    }
  };

  const handleDeleteClient = async (firebaseId: string) => {
    try {
      await deleteDoc(doc(db, 'clients', firebaseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${firebaseId}`);
    }
  };

  return { clients, handleAddClient, handleUpdateClient, handleDeleteClient };
}
