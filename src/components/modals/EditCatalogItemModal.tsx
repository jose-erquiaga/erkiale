import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CatalogItem } from '../../types';

interface EditCatalogItemModalProps {
  editingCatalogItem: CatalogItem | null;
  setEditingCatalogItem: (item: CatalogItem | null) => void;
  units: string[];
  handleUpdateCatalogItem: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const EditCatalogItemModal = ({
  editingCatalogItem,
  setEditingCatalogItem,
  units,
  handleUpdateCatalogItem,
}: EditCatalogItemModalProps) => (
  <AnimatePresence>
    {editingCatalogItem && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingCatalogItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
         <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">Editar Catálogo</h3>
              <button onClick={() => setEditingCatalogItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateCatalogItem} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                <input name="concept" defaultValue={editingCatalogItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unidad</label>
                   <select name="unit" defaultValue={editingCatalogItem.unit} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Ud (€)</label>
                   <input name="price" type="number" step="0.01" min="0" defaultValue={editingCatalogItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 mt-2">Actualizar Maestro</button>
            </form>
         </motion.div>
      </div>
    )}
  </AnimatePresence>
);
