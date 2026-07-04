import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ExpenseItem } from '../../types';

interface EditExpenseItemModalProps {
  editingExpenseItem: ExpenseItem | null;
  setEditingExpenseItem: (item: ExpenseItem | null) => void;
  handleUpdateExpenseItem: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const EditExpenseItemModal = ({
  editingExpenseItem,
  setEditingExpenseItem,
  handleUpdateExpenseItem,
}: EditExpenseItemModalProps) => {
  const [tipo, setTipo] = useState<'material' | 'trabajo'>(editingExpenseItem?.tipo || 'material');

  return (
    <AnimatePresence>
      {editingExpenseItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingExpenseItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">Editar Gasto</h3>
                <button onClick={() => setEditingExpenseItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
              </div>
              <form onSubmit={handleUpdateExpenseItem} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo</label>
                  <select name="tipo" value={tipo} onChange={e => setTipo(e.target.value as 'material' | 'trabajo')} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                    <option value="material">Material</option>
                    <option value="trabajo">Trabajo a realizar</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha</label>
                     <input name="date" type="date" defaultValue={editingExpenseItem.date} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Proveedor</label>
                     <input name="provider" defaultValue={editingExpenseItem.provider} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                  <input name="concept" defaultValue={editingExpenseItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                </div>
                {tipo === 'material' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Base (€)</label>
                       <input name="base" type="number" step="0.01" min="0" defaultValue={editingExpenseItem.base} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">IVA (€)</label>
                       <input name="iva" type="number" step="0.01" min="0" defaultValue={editingExpenseItem.iva} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cantidad (€)</label>
                     <input name="amount" type="number" step="0.01" min="0" defaultValue={editingExpenseItem.amount} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                )}
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Forma de pago</label>
                   <select name="paymentMethod" defaultValue={editingExpenseItem.paymentMethod} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                     <option value="efectivo">Efectivo</option>
                     <option value="tarjeta">Tarjeta</option>
                     <option value="transferencia">Transferencia</option>
                     <option value="a_cuenta">A cuenta</option>
                   </select>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 mt-2">Guardar Cambios</button>
              </form>
           </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
