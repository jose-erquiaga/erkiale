import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { CompanyInfo } from '../types';
import { DEFAULT_COMPANY } from '../data/constants';

export function useSettings(user: unknown) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(DEFAULT_COMPANY);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;

    const pathSettings = 'settings/global';
    const settingsUnsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.companyInfo) setCompanyInfo(data.companyInfo);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, pathSettings));

    return () => settingsUnsubscribe();
  }, [user]);

  return {
    companyInfo,
  };
}
