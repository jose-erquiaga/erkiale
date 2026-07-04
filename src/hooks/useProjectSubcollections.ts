import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { Project, BudgetItem, ExpenseItem } from '../types';
import type { HierarchicalCatalogItem } from '../types/catalogHierarchy';
import { scanExpenseInvoice } from '../services/geminiService';

export interface ScannedExpenseComponentDraft {
  concept: string;
  quantity: number;
  unitPrice: number;
  price: number;
}

export interface ScannedExpensePreviewState {
  provider: string;
  date: string;
  tipo: 'material' | 'trabajo';
  paymentMethod: ExpenseItem['paymentMethod'];
  components: ScannedExpenseComponentDraft[];
}

export function useProjectSubcollections(user: unknown, selectedProjectId: string, projects: Project[]) {
  const [budgets, setBudgets] = useState<Record<number | string, BudgetItem[]>>({});
  const [invoices, setInvoices] = useState<Record<number | string, BudgetItem[]>>({});
  const [expenses, setExpenses] = useState<Record<number | string, ExpenseItem[]>>({});

  const [isScanningExpense, setIsScanningExpense] = useState(false);
  const [expenseScanError, setExpenseScanError] = useState<string | null>(null);
  const [scannedExpensePreview, setScannedExpensePreview] = useState<ScannedExpensePreviewState | null>(null);
  const [isConfirmingExpense, setIsConfirmingExpense] = useState(false);

  useEffect(() => {
    // CRITICAL: Don't listen for subcollections if no project is selected or if it's the initial "0"
    if (!user || !selectedProjectId) return;

    const projectIdStr = String(selectedProjectId);

    // Safety check: ensure project actually exists in projects list
    const projectExists = projects.some(p => p.firebaseId === selectedProjectId);
    if (!projectExists) return;

    const pathBudget = `projects/${projectIdStr}/budget_items`;
    const budgetUnsubscribe = onSnapshot(collection(db, 'projects', projectIdStr, 'budget_items'), (snapshot) => {
      setBudgets(prev => ({
        ...prev,
        [selectedProjectId]: snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as BudgetItem))
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathBudget));

    const pathInvoice = `projects/${projectIdStr}/invoice_items`;
    const invoiceUnsubscribe = onSnapshot(collection(db, 'projects', projectIdStr, 'invoice_items'), (snapshot) => {
      setInvoices(prev => ({
        ...prev,
        [selectedProjectId]: snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as BudgetItem))
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathInvoice));

    const pathExpense = `projects/${projectIdStr}/expense_items`;
    const expenseUnsubscribe = onSnapshot(collection(db, 'projects', projectIdStr, 'expense_items'), (snapshot) => {
      setExpenses(prev => ({
        ...prev,
        [selectedProjectId]: snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as ExpenseItem))
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathExpense));

    return () => {
      budgetUnsubscribe();
      invoiceUnsubscribe();
      expenseUnsubscribe();
    };
  }, [user, selectedProjectId, projects]);

  const handleAddBudgetItemFromCatalog = async (catalogItem: HierarchicalCatalogItem, qty: number, guildName?: string, roomName?: string) => {
    const newItem = {
      id: Date.now(),
      concept: catalogItem.description,
      qty,
      unit: catalogItem.unit,
      price: catalogItem.price,
      total: qty * catalogItem.price,
      tipo: catalogItem.type,
      guildId: catalogItem.guildId,
      roomId: catalogItem.roomId,
      ...(guildName ? { guildName } : {}),
      ...(roomName ? { roomName } : {}),
    };

    try {
      await addDoc(collection(db, 'projects', String(selectedProjectId), 'budget_items'), newItem);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${selectedProjectId}/budget_items`);
      return false;
    }
  };

  const handleAddAdHocBudgetItem = async (data: { concept: string; qty: number; unit: string; price: number; tipo: 'tareas' | 'material'; guildId?: string; guildName?: string; roomId?: string; roomName?: string }) => {
    const newItem = {
      id: Date.now(),
      concept: data.concept,
      qty: data.qty,
      unit: data.unit,
      price: data.price,
      total: data.qty * data.price,
      tipo: data.tipo,
      ...(data.guildId ? { guildId: data.guildId } : {}),
      ...(data.guildName ? { guildName: data.guildName } : {}),
      ...(data.roomId ? { roomId: data.roomId } : {}),
      ...(data.roomName ? { roomName: data.roomName } : {}),
    };

    try {
      await addDoc(collection(db, 'projects', String(selectedProjectId), 'budget_items'), newItem);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${selectedProjectId}/budget_items`);
      return false;
    }
  };

  const handleUpdateBudgetItem = async (editingBudgetItem: BudgetItem | null, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBudgetItem || !editingBudgetItem.firebaseId) return;
    const formData = new FormData(e.currentTarget);
    const concept = formData.get('concept') as string;
    const qty = parseFloat(formData.get('qty') as string) || 0;
    const price = parseFloat(formData.get('price') as string) || 0;

    try {
      await updateDoc(doc(db, 'projects', String(selectedProjectId), 'budget_items', editingBudgetItem.firebaseId), {
        concept,
        qty,
        price,
        total: qty * price
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProjectId}/budget_items/${editingBudgetItem.firebaseId}`);
    }
  };

  const handleGenerateInvoice = async () => {
    const budgetItems = budgets[selectedProjectId] || [];
    if (budgetItems.length === 0) {
      alert("No hay partidas en el presupuesto activo para facturar.");
      return false;
    }

    if (invoices[selectedProjectId] && invoices[selectedProjectId].length > 0) {
      if (!confirm("Ya existe una factura para este proyecto con cambios guardados. ¿Deseas SOBRESCRIBIRLA con los datos del presupuesto actual? Perderás los cambios específicos de facturación.")) {
        return false;
      }
    }

    try {
      const projectIdStr = String(selectedProjectId);
      const existingInvoices = invoices[selectedProjectId] || [];
      for (const item of existingInvoices) {
        if (item.firebaseId) {
          await deleteDoc(doc(db, 'projects', projectIdStr, 'invoice_items', item.firebaseId));
        }
      }

      for (const item of budgetItems) {
        await addDoc(collection(db, 'projects', projectIdStr, 'invoice_items'), {
          concept: item.concept,
          qty: item.qty,
          unit: item.unit,
          price: item.price,
          total: item.total,
          tipo: item.tipo,
          ...(item.guildId ? { guildId: item.guildId } : {}),
          ...(item.guildName ? { guildName: item.guildName } : {}),
          ...(item.roomId ? { roomId: item.roomId } : {}),
          ...(item.roomName ? { roomName: item.roomName } : {}),
        });
      }
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${selectedProjectId}/invoice_items`);
      return false;
    }
  };

  const handleUpdateInvoiceItem = async (editingInvoiceItem: BudgetItem | null, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInvoiceItem || !editingInvoiceItem.firebaseId) return;
    const formData = new FormData(e.currentTarget);
    const concept = formData.get('concept') as string;
    const qty = parseFloat(formData.get('qty') as string) || 0;
    const price = parseFloat(formData.get('price') as string) || 0;

    try {
      await updateDoc(doc(db, 'projects', String(selectedProjectId), 'invoice_items', editingInvoiceItem.firebaseId), {
        concept,
        qty,
        price,
        total: qty * price
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProjectId}/invoice_items/${editingInvoiceItem.firebaseId}`);
    }
  };

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
      await addDoc(collection(db, 'projects', String(selectedProjectId), 'expense_items'), data);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${selectedProjectId}/expense_items`);
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
      console.error("Expense Scan Error:", error);
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
          await addDoc(collection(db, 'projects', String(selectedProjectId), 'expense_items'), data);
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
      await updateDoc(doc(db, 'projects', String(selectedProjectId), 'expense_items', editingExpenseItem.firebaseId), {
        tipo,
        date: formData.get('date') as string,
        provider: formData.get('provider') as string,
        concept: formData.get('concept') as string,
        ...(tipo === 'material' ? { base, iva, amount: null } : { amount, base: null, iva: null }),
        total,
        paymentMethod: formData.get('paymentMethod') as ExpenseItem['paymentMethod'],
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProjectId}/expense_items/${editingExpenseItem.firebaseId}`);
    }
  };

  return {
    budgets,
    invoices,
    expenses,
    handleAddBudgetItemFromCatalog,
    handleAddAdHocBudgetItem,
    handleUpdateBudgetItem,
    handleGenerateInvoice,
    handleUpdateInvoiceItem,
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
