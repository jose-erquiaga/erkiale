import React from 'react';
import { Receipt, Hammer, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Project, BudgetItem } from '../types';

interface BillingViewProps {
  project: Project;
  selectedProjectId: string;
  invoices: Record<number | string, BudgetItem[]>;
  setActiveTab: (tab: string) => void;
  setEditingInvoiceItem: (item: BudgetItem | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
  setIsInvoiceVisible: (value: boolean) => void;
}

export const BillingView = ({
  project,
  selectedProjectId,
  invoices,
  setActiveTab,
  setEditingInvoiceItem,
  setDeleteConfirmation,
  setIsInvoiceVisible,
}: BillingViewProps) => {
  if (!project) return <div className="p-12 text-center text-slate-400 italic">No hay ningún proyecto seleccionado.</div>;
  const invoiceItems = invoices[selectedProjectId] ?? [];
  const total = invoiceItems.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Partidas a Facturar</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Importado de Presupuesto Activo</p>
          </div>
          <div className="text-right">
             <p className="text-[11px] font-black text-slate-400 uppercase">Total Base Imponible</p>
             <p className="text-xl font-black text-blue-600">{total.toLocaleString()} €</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cant.</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio Ud.</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-20 text-center">
                  <div className="flex flex-col items-center gap-4 text-slate-300">
                    <Receipt size={48} className="opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No hay datos importados para facturar</p>
                    <button onClick={() => setActiveTab('budgets')} className="text-blue-500 text-[10px] font-black uppercase underline">Ir a Presupuestos</button>
                  </div>
                </td>
              </tr>
            ) : (
              invoiceItems.map((item, idx) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-slate-50 hover:bg-emerald-50/10 transition-all cursor-default group"
                >
                  <td className="p-6">
                    <span className="text-sm font-bold text-slate-800">{item.concept}</span>
                  </td>
                  <td className="p-6 text-sm text-slate-600 font-bold text-center">
                    <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{item.qty} {item.unit}</span>
                  </td>
                  <td className="p-6 text-sm text-slate-500 font-medium text-right">{item.price.toFixed(2)}€</td>
                  <td className="p-6 text-sm font-black text-slate-900 text-right">{item.total.toFixed(2)}€</td>
                  <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingInvoiceItem(item)}
                          className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-colors bg-blue-50/50"
                        >
                          <Hammer size={14}/>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation({ id: item.firebaseId, type: 'invoice', label: item.concept })}
                          className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors bg-rose-50/50"
                        >
                          <X size={14}/>
                        </button>
                      </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
           <button
             onClick={() => setIsInvoiceVisible(true)}
             disabled={invoiceItems.length === 0}
             className="px-8 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl disabled:bg-slate-300"
           >
             Vista Previa & PDF
           </button>
        </div>
      </div>
    </div>
  );
};
