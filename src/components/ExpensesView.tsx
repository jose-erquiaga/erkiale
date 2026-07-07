import React from 'react';
import { Camera, Hammer, X, ChevronDown } from 'lucide-react';
import type { Project, ExpenseItem } from '../types';
import { CameraReceiptCapture } from './CameraReceiptCapture';

interface ExpensesViewProps {
  project: Project;
  selectedProjectId: string;
  expenses: Record<number | string, ExpenseItem[]>;
  setEditingExpenseItem: (item: ExpenseItem | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
  handleSaveExpense: (e: React.FormEvent<HTMLFormElement>) => void;
  isScanningExpense: boolean;
  expenseScanError: string | null;
  handleExpenseScan: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PAYMENT_METHOD_LABELS: Record<ExpenseItem['paymentMethod'], string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  a_cuenta: 'A cuenta',
};

function SelectChevron() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
      <ChevronDown size={14} />
    </div>
  );
}

export const ExpensesView = ({
  project,
  selectedProjectId,
  expenses,
  setEditingExpenseItem,
  setDeleteConfirmation,
  handleSaveExpense,
  isScanningExpense,
  expenseScanError,
  handleExpenseScan,
}: ExpensesViewProps) => {
  if (!project) return <div className="p-12 text-center text-slate-400 italic">No hay ningún proyecto seleccionado. Crea uno para empezar.</div>;
  const projectExpenses = expenses[selectedProjectId] ?? [];
  const [tipo, setTipo] = React.useState<'material' | 'trabajo'>('material');
  const [showCameraModal, setShowCameraModal] = React.useState(false);
  const [extractedItems, setExtractedItems] = React.useState<{concepto: string; cantidad: number; precioUnitario: number; iva?: number} | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Gastos Registrados</h4>
            <button
              onClick={() => setShowCameraModal(true)}
              className={`flex items-center gap-2 text-[10px] font-black px-5 py-3 rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-blue-100 ${isScanningExpense ? 'bg-blue-300 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              disabled={isScanningExpense}
            >
              <Camera size={16} /> Capturar Factura
            </button>
          </div>

          {expenseScanError && (
            <div className="px-8 py-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-[11px] font-bold">{expenseScanError}</div>
          )}

          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] uppercase text-slate-400">
                <th className="p-6">Fecha/Concepto</th>
                <th className="p-6">Proveedor</th>
                <th className="p-6 text-center">Tipo</th>
                <th className="p-6 text-center">Pago</th>
                <th className="p-6 text-right">Total</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {projectExpenses.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">No hay gastos registrados</td></tr>
              ) : (
                projectExpenses.map(exp => (
                  <tr key={exp.id}>
                    <td className="p-6">
                      <div className="font-black text-slate-300 text-[10px] mb-1">{exp.date}</div>
                      <div className="font-bold text-slate-800">{exp.concept}</div>
                    </td>
                    <td className="p-6 text-slate-600 font-bold">{exp.provider}</td>
                    <td className="p-6 text-center uppercase text-[10px] font-black text-slate-500">{exp.tipo === 'material' ? 'Material' : 'Trabajo'}</td>
                    <td className="p-6 text-center uppercase text-[10px] font-black text-slate-500">{PAYMENT_METHOD_LABELS[exp.paymentMethod]}</td>
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
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="relative">
            <select name="tipo" value={tipo} onChange={e => setTipo(e.target.value as 'material' | 'trabajo')} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold appearance-none cursor-pointer">
              <option value="material">Material</option>
              <option value="trabajo">Trabajo a realizar</option>
            </select>
            <SelectChevron />
          </div>
          <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
          <input name="provider" placeholder="Proveedor" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
          <input name="concept" placeholder="Concepto" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
          {tipo === 'material' ? (
            <div className="grid grid-cols-2 gap-2">
              <input name="base" placeholder="Base €" type="number" step="0.01" min="0" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
              <input name="iva" placeholder="IVA €" type="number" step="0.01" min="0" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
            </div>
          ) : (
            <input name="amount" placeholder="Cantidad €" type="number" step="0.01" min="0" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
          )}
          <div className="relative">
            <select name="paymentMethod" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold appearance-none cursor-pointer">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="a_cuenta">A cuenta</option>
            </select>
            <SelectChevron />
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Añadir Gasto</button>
        </form>
      </div>

      <CameraReceiptCapture
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onItemsExtracted={(items) => {
          if (items.length > 0) {
            const item = items[0];
            setExtractedItems(item);
            setShowCameraModal(false);
            // Auto-fill the form with extracted data
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) {
              form.concept.value = item.concepto;
              form.provider.value = 'Factura escaneada';
              if (tipo === 'material') {
                form.base.value = item.precioUnitario.toString();
                form.iva.value = (item.iva || 0).toString();
              } else {
                form.amount.value = item.precioUnitario.toString();
              }
            }
          }
        }}
      />
    </div>
  );
};
