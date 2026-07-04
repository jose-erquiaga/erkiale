import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { ExpenseItem } from '../types';
import { scanExpenseInvoice } from '../services/geminiService';
import type { ScannedExpensePreviewState } from './useProjectSubcollections';

export function useCompanyExpenses(user: unknown) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  const [isScanningExpense, setIsScanningExpense] = useState(false);
  const [expenseScanError, setExpenseScanError] = useState<string | null>(null);
  const [scannedExpensePreview, setScannedExpensePreview] = useState<ScannedExpensePreviewState | null>(null);
  const [isConfirmingExpense, setIsConfirmingExpense] = useState(false);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;

    const pathExpense = 'company_expenses';
    const expenseUnsubscribe = onSnapshot(collection(db, 'company_expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ ...d.data(), firebaseId: d.id } as ExpenseItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathExpense));

    return () => expenseUnsubscribe();
  }, [user]);

  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const tipo = formData.get('tipo') as 'material' | 'trabajo';
    const base = parseFloat(formData.get('base') as string) || 0;
    const iva = parseFloat(formData.get('iva') as string) || 0;
    const amount = parseFloat(formData.get('amount') as string) || 0;
    const total = tipo === 'material' ? base + iva : amount;

    const data = {
      id: Date.now(),
      tipo,
      date: formData.get('date') as string,
      provider: formData.get('provider') as string,
      concept: formData.get('concept') as string,
      ...(tipo === 'material' ? { base, iva } : { amount }),
      total,
      paymentMethod: formData.get('paymentMethod') as ExpenseItem['paymentMethod'],
    };

    try {
      await addDoc(collection(db, 'company_expenses'), data);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'company_expenses');
    }
  };

  const handleExpenseScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsScanningExpense(true);
    setExpenseScanError(null);

    try {
      const scanned = await scanExpenseInvoice(file);
      setScannedExpensePreview({
        provider: scanned.provider || '',
        date: scanned.date || new Date().toISOString().split('T')[0],
        tipo: 'material',
        paymentMethod: 'efectivo',
        components: (scanned.components || []).map(c => {
          const price = Number(c.price) || 0;
          const quantity = Number(c.quantity) || 1;
          const unitPrice = Number(c.unitPrice) || price;
          return { concept: c.concept || '', quantity, unitPrice, price };
        }),
      });
    } catch (error) {
      console.error("Company Expense Scan Error:", error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
        setExpenseScanError("Cuota de IA agotada. Has superado el límite gratuito de Gemini. Espera un momento o revisa tu plan en ai.google.dev.");
      } else {
        setExpenseScanError("No se pudo analizar la factura. Inténtalo de nuevo o cárgala manualmente.");
      }
    } finally {
      setIsScanningExpense(false);
    }
  };

  const handleConfirmScannedExpense = async () => {
    if (!scannedExpensePreview) return;
    setIsConfirmingExpense(true);
    try {
      let saved = 0;
      for (const component of scannedExpensePreview.components) {
        const { tipo, date, provider, paymentMethod } = scannedExpensePreview;
        const total = component.price;
        const base = Math.round((total / 1.21) * 100) / 100;
        const iva = Math.round((total - base) * 100) / 100;
        const data = {
          id: Date.now() + Math.random(),
          tipo,
          date,
          provider,
          concept: component.concept,
          ...(tipo === 'material' ? { base, iva } : { amount: total }),
          total,
          paymentMethod,
        };
        try {
          await addDoc(collection(db, 'company_expenses'), data);
          saved++;
        } catch {
          // continue saving remaining components
        }
      }
      if (saved > 0) setScannedExpensePreview(null);
    } finally {
      setIsConfirmingExpense(false);
    }
  };

  const handleUpdateExpenseItem = async (editingExpenseItem: ExpenseItem | null, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpenseItem || !editingExpenseItem.firebaseId) return;
    const formData = new FormData(e.currentTarget);
    const tipo = formData.get('tipo') as 'material' | 'trabajo';
    const base = parseFloat(formData.get('base') as string) || 0;
    const iva = parseFloat(formData.get('iva') as string) || 0;
    const amount = parseFloat(formData.get('amount') as string) || 0;
    const total = tipo === 'material' ? base + iva : amount;

    try {
      await updateDoc(doc(db, 'company_expenses', editingExpenseItem.firebaseId), {
        tipo,
        date: formData.get('date') as string,
        provider: formData.get('provider') as string,
        concept: formData.get('concept') as string,
        ...(tipo === 'material' ? { base, iva, amount: null } : { amount, base: null, iva: null }),
        total,
        paymentMethod: formData.get('paymentMethod') as ExpenseItem['paymentMethod'],
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `company_expenses/${editingExpenseItem.firebaseId}`);
    }
  };

  return {
    expenses,
    handleSaveExpense,
    handleUpdateExpenseItem,
    isScanningExpense,
    expenseScanError,
    setExpenseScanError,
    scannedExpensePreview,
    setScannedExpensePreview,
    isConfirmingExpense,
    handleExpenseScan,
    handleConfirmScannedExpense,
  };
}
