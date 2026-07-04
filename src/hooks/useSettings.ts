import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { CompanyInfo } from '../types';
import { DEFAULT_COMPANY, DEFAULT_EXPENSE_CATEGORIES } from '../data/constants';

export function useSettings(user: unknown) {
  const [categories, setCategories] = useState<string[]>(['Pintura', 'Escayola', 'Suelos', 'Baños', 'Cocinas', 'Fontanería', 'Electricidad']);
  const [units, setUnits] = useState<string[]>(['m2', 'ml', 'ud', 'litros', 'm3', 'kg']);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;

    const pathSettings = 'settings/global';
    const settingsUnsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.categories) setCategories(data.categories);
        if (data.units) setUnits(data.units);
        if (data.companyInfo) setCompanyInfo(data.companyInfo);
        if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, pathSettings));

    return () => settingsUnsubscribe();
  }, [user]);

  const saveNewCategory = async (tempCategory: string) => {
    if (!isFirebaseConfigured || !db) return;
    const trimmed = tempCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      const newCats = [...categories, trimmed];
      try {
        await setDoc(doc(db, 'settings', 'global'), {
          categories: newCats,
          units: units.length > 0 ? units : ['m2', 'ml', 'ud', 'litros', 'm3', 'kg']
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'settings/global');
      }
    }
  };

  const saveNewUnit = async (tempUnit: string) => {
    if (!isFirebaseConfigured || !db) return;
    const trimmed = tempUnit.trim();
    if (trimmed && !units.includes(trimmed)) {
      const newUnits = [...units, trimmed];
      try {
        await setDoc(doc(db, 'settings', 'global'), {
          categories: categories.length > 0 ? categories : ['Pintura', 'Escayola', 'Suelos', 'Baños', 'Cocinas', 'Fontanería', 'Electricidad'],
          units: newUnits
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'settings/global');
      }
    }
  };

  return {
    categories,
    units,
    companyInfo,
    expenseCategories,
    saveNewCategory,
    saveNewUnit,
  };
}
