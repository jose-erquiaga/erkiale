import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { BudgetItem } from '../../types';

interface EditInvoiceItemModalProps {
  editingInvoiceItem: BudgetItem | null;
  setEditingInvoiceItem: (item: BudgetItem | null) => void;
  handleUpdateInvoiceItem: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const EditInvoiceItemModal = ({ editingInvoiceItem, setEditingInvoiceItem, handleUpdateInvoiceItem }: EditInvoiceItemModalProps) => (
  <AnimatePresence>
    {editingInvoiceItem && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingInvoiceItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
         <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Editar Partida Factura</h3>
              <button onClick={() => setEditingInvoiceItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateInvoiceItem} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                <input name="concept" defaultValue={editingInvoiceItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cantidad ({editingInvoiceItem.unit})</label>
                   <input name="qty" type="number" step="0.01" min="0.01" defaultValue={editingInvoiceItem.qty} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Ud (€)</label>
                   <input name="price" type="number" step="0.01" min="0" defaultValue={editingInvoiceItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 mt-2">Guardar Cambios Factura</button>
            </form>
         </motion.div>
      </div>
    )}
  </AnimatePresence>
);
