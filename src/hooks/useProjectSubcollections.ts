import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { Project, BudgetItem, ExpenseItem, CatalogItem } from '../types';

export function useProjectSubcollections(user: unknown, selectedProjectId: string, projects: Project[]) {
  const [budgets, setBudgets] = useState<Record<number | string, BudgetItem[]>>({});
  const [invoices, setInvoices] = useState<Record<number | string, BudgetItem[]>>({});
  const [expenses, setExpenses] = useState<Record<number | string, ExpenseItem[]>>({});

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

  const handleAddBudgetItem = async (catalog: CatalogItem[], catalogItemId: string, qty: number) => {
    const catalogItem = catalog.find(item => item.firebaseId === catalogItemId);
    if (!catalogItem) return;

    const newItem = {
      id: Date.now(),
      concept: catalogItem.concept,
      qty: qty,
      unit: catalogItem.unit,
      price: catalogItem.price,
      total: qty * catalogItem.price
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
          total: item.total
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
    handleAddBudgetItem,
    handleUpdateBudgetItem,
    handleGenerateInvoice,
    handleUpdateInvoiceItem,
    handleSaveExpense,
    handleUpdateExpenseItem,
  };
}
