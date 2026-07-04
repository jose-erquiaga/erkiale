import React, { useState } from 'react';
import { Camera, Hammer, X } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import type { Project, ExpenseItem } from '../types';
import { scanDocument, ScanType } from '../services/geminiService';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';

interface ExpensesViewProps {
  project: Project;
  selectedProjectId: string;
  expenses: Record<number | string, ExpenseItem[]>;
  expenseCategories: string[];
  setEditingExpenseItem: (item: ExpenseItem | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
}

export const ExpensesView = ({
  project,
  selectedProjectId,
  expenses,
  expenseCategories,
  setEditingExpenseItem,
  setDeleteConfirmation,
}: ExpensesViewProps) => {
  if (!project) return <div className="p-12 text-center text-slate-400 italic">No hay ningún proyecto seleccionado. Crea uno para empezar.</div>;
  const projectExpenses = expenses[selectedProjectId] ?? [];
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const extractedItems = await scanDocument(file, ScanType.EXPENSE);
      let saved = 0;
      for (const item of extractedItems) {
        try {
          await addDoc(collection(db, 'projects', String(selectedProjectId), 'expense_items'), {
            ...item,
            id: Date.now() + Math.random()
          });
          saved++;
        } catch {
          // continue saving remaining items
        }
      }
      if (saved === 0 && extractedItems.length > 0) {
        setScanError("No se pudieron guardar los gastos. Comprueba tu conexión.");
      }
    } catch (error) {
      console.error("AI Scan Error:", error);
      setScanError("No se pudo analizar la factura. Inténtalo de nuevo o cárgala manualmente.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddManualExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const qty = parseFloat(formData.get('qty') as string) || 0;
    const price = parseFloat(formData.get('price') as string) || 0;

    const newItem = {
      id: Date.now(),
      concept: formData.get('concept') as string,
      qty,
      unit: formData.get('unit') as string,
      price,
      total: qty * price,
      date: formData.get('date') as string,
      category: formData.get('category') as string
    };

    try {
      await addDoc(collection(db, 'projects', String(selectedProjectId), 'expense_items'), newItem);
      form.reset();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${selectedProjectId}/expense_items`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Gastos Registrados</h4>
            <div className="flex gap-2">
              <label className={`flex items-center gap-2 text-[10px] font-black cursor-pointer px-4 py-2 rounded-xl transition-all uppercase tracking-widest border border-blue-100 ${isScanning ? 'bg-blue-100' : 'bg-blue-50 text-blue-600'}`}>
                {isScanning ? "Procesando..." : <><Camera size={14} /> Scanner IA / Foto</>}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={handleFileUpload}
                  disabled={isScanning}
                />
              </label>
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] uppercase text-slate-400">
                <th className="p-6">Fecha/Concepto</th>
                <th className="p-6">Categoría</th>
                <th className="p-6 text-center">Cant.</th>
                <th className="p-6 text-right">Total</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {projectExpenses.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No hay gastos registrados</td></tr>
              ) : (
                projectExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td className="p-6">
                      <div className="font-black text-slate-300 text-[10px] mb-1">{exp.date}</div>
                      <div className="font-bold text-slate-800">{exp.concept}</div>
                    </td>
                    <td className="p-6 uppercase text-[10px] font-black text-slate-500">{exp.category}</td>
                    <td className="p-6 text-center font-bold text-slate-600">{exp.qty} {exp.unit}</td>
                    <td className="p-6 text-right font-black text-slate-900">{exp.total.toFixed(2)} €</td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                         <button
                           onClick={() => setEditingExpenseItem(exp)}
                           className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                         >
                           <Hammer size={14} />
                         </button>
                         <button
                           onClick={() => setDeleteConfirmation({ id: exp.firebaseId, type: 'expense', label: exp.concept })}
                           className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                         >
                           <X size={14} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl self-start sticky top-12">
        <h4 className="text-sm font-black uppercase tracking-widest mb-6 px-1">Registrar Nuevo Gasto</h4>
        <form onSubmit={handleAddManualExpense} className="space-y-4">
          <input name="concept" placeholder="Concepto" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
          <div className="grid grid-cols-2 gap-4">
            <select name="category" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold appearance-none">
              {expenseCategories.map(c => <option key={c}>{c}</option>)}
            </select>
            <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input name="qty" placeholder="Cant." type="number" step="0.01" min="0.01" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
            <input name="unit" placeholder="Ud." required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
            <input name="price" placeholder="€/Ud." type="number" step="0.01" min="0" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Añadir Gasto</button>
        </form>
      </div>
    </div>
  );
};
