import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { CatalogItem } from '../types';
import { scanDocument, ScanType } from '../services/geminiService';

export function useCatalog(user: unknown, categories: string[], units: string[]) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [isScanningCatalog, setIsScanningCatalog] = useState(false);
  const [catalogScanError, setCatalogScanError] = useState<string | null>(null);
  const [scannedCatalogPreview, setScannedCatalogPreview] = useState<Array<{ concept: string; category: string; unit: string; price: number }> | null>(null);
  const [isConfirmingCatalog, setIsConfirmingCatalog] = useState(false);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;

    const pathCatalog = 'catalog';
    const catalogUnsubscribe = onSnapshot(collection(db, 'catalog'), (snapshot) => {
      setCatalog(snapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, firebaseId: doc.id, id: data.id || doc.id } as CatalogItem;
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathCatalog));

    return () => catalogUnsubscribe();
  }, [user]);

  const handleAddCatalogItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFirebaseConfigured) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newItem = {
      category: formData.get('category') as string,
      concept: formData.get('concept') as string,
      unit: formData.get('unit') as string,
      price: parseFloat(formData.get('price') as string) || 0,
      id: Date.now()
    };
    try {
      await addDoc(collection(db, 'catalog'), newItem);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'catalog');
    }
  };

  const handleUpdateCatalogItem = async (editingCatalogItem: CatalogItem | null, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCatalogItem || !editingCatalogItem.firebaseId) return;
    const formData = new FormData(e.currentTarget);
    const concept = formData.get('concept') as string;
    const unit = formData.get('unit') as string;
    const price = parseFloat(formData.get('price') as string) || 0;

    try {
      await updateDoc(doc(db, 'catalog', editingCatalogItem.firebaseId), {
        concept,
        unit,
        price
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `catalog/${editingCatalogItem.firebaseId}`);
    }
  };

  const handleCatalogScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsScanningCatalog(true);
    setCatalogScanError(null);
    try {
      const items = await scanDocument(file, ScanType.CATALOG);
      setScannedCatalogPreview(items.map((i: any) => ({
        concept: i.concept || '',
        category: i.category || categories[0] || '',
        unit: i.unit || units[0] || '',
        price: Number(i.price) || 0
      })));
    } catch (error) {
      console.error("Catalog Scan Error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        setCatalogScanError("Cuota de IA agotada. Has superado el límite gratuito de Gemini. Espera un momento o revisa tu plan en ai.google.dev.");
      } else {
        setCatalogScanError("Error al escanear. Verifica que el archivo sea una imagen o PDF legible.");
      }
    } finally {
      setIsScanningCatalog(false);
    }
  };

  const handleConfirmScannedCatalog = async () => {
    if (!scannedCatalogPreview) return;
    setIsConfirmingCatalog(true);
    try {
      for (const item of scannedCatalogPreview) {
        await addDoc(collection(db, 'catalog'), { ...item, id: Date.now() + Math.random() });
      }
      setScannedCatalogPreview(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'catalog');
    } finally {
      setIsConfirmingCatalog(false);
    }
  };

  return {
    catalog,
    isScanningCatalog,
    catalogScanError,
    setCatalogScanError,
    scannedCatalogPreview,
    setScannedCatalogPreview,
    isConfirmingCatalog,
    handleAddCatalogItem,
    handleUpdateCatalogItem,
    handleCatalogScan,
    handleConfirmScannedCatalog,
  };
}
