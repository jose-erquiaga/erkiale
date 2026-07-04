import React from 'react';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDeleteModalProps {
  deleteConfirmation: { id: any; type: string; label: string } | null;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
  confirmDelete: () => void;
}

export const ConfirmDeleteModal = ({ deleteConfirmation, setDeleteConfirmation, confirmDelete }: ConfirmDeleteModalProps) => (
  <AnimatePresence>
    {deleteConfirmation && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmation(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2rem] p-10 w-full max-w-md relative z-10 shadow-2xl">
          <div className="flex flex-col items-center text-center gap-6">
            <div className="p-4 bg-rose-50 text-rose-500 rounded-full">
              <AlertCircle size={48} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-2">¿Confirmar eliminación?</h3>
              <p className="text-slate-500 text-sm font-medium italic">"{deleteConfirmation.label}"</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDeleteConfirmation(null)} className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 px-6 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100">Eliminar</button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
