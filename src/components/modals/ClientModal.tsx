import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Client } from '../../types';
import type { ClientFormData } from '../../hooks/useClients';

interface ClientModalProps {
  isOpen: boolean;
  editingClient: Client | null;
  onClose: () => void;
  onSave: (data: ClientFormData) => void;
}

export const ClientModal = ({ isOpen, editingClient, onClose, onSave }: ClientModalProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSave({
      name: formData.get('name') as string,
      cif: formData.get('cif') as string,
      address: formData.get('address') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden relative z-10 border border-white/20"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ficha de cliente</p>
              </div>
              <button onClick={onClose} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-slate-900 transition-all border border-slate-100">
                <X size={24} />
              </button>
            </div>
            <form key={editingClient?.firebaseId || 'new'} onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nombre Cliente / Empresa</label>
                <input name="name" defaultValue={editingClient?.name} required type="text" placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">CIF / NIF</label>
                <input name="cif" defaultValue={editingClient?.cif} required type="text" placeholder="Ej: 12345678Z" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Dirección</label>
                <input name="address" defaultValue={editingClient?.address} required type="text" placeholder="Calle, Número, CP, Ciudad" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email de Contacto</label>
                  <input name="email" defaultValue={editingClient?.email} required type="email" placeholder="cliente@ejemplo.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Teléfono</label>
                  <input name="phone" defaultValue={editingClient?.phone} required type="tel" placeholder="Ej: 600000000" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white p-6 rounded-[1.75rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-blue-200 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all mt-4">
                {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
