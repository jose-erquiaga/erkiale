import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NewProjectModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (value: boolean) => void;
  handleAddProject: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const NewProjectModal = ({ isModalOpen, setIsModalOpen, handleAddProject }: NewProjectModalProps) => (
  <AnimatePresence>
    {isModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsModalOpen(false)}
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
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nuevo Expediente</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Apertura de ficha de obra</p>
            </div>
            <button
                onClick={() => setIsModalOpen(false)}
                className="p-3 bg-white text-slate-400 rounded-2xl hover:text-slate-900 transition-all border border-slate-100"
            >
                <X size={24}/>
            </button>
          </div>
          <form onSubmit={handleAddProject} className="p-10 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Título del Proyecto</label>
              <input name="name" required type="text" placeholder="Ej: Reforma Planta 3 Calle Serrano" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nombre Cliente / Empresa</label>
                <input name="clientName" required type="text" placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">CIF / NIF</label>
                <input name="clientCIF" required type="text" placeholder="Ej: 12345678Z" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Dirección Fiscal / Obra</label>
              <input name="clientAddress" required type="text" placeholder="Calle, Número, CP, Ciudad" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email de Contacto</label>
                <input name="clientEmail" required type="email" placeholder="cliente@ejemplo.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Teléfono</label>
                <input name="clientPhone" required type="tel" placeholder="Ej: 600000000" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Categoría Obra</label>
              <select name="category" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm">
                <option value="Vivienda">Vivienda</option>
                <option value="Cocina">Cocina</option>
                <option value="Baño">Baño</option>
                <option value="Local">Local Comercial</option>
                <option value="General">General</option>
              </select>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white p-6 rounded-[1.75rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-blue-200 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all mt-4">
              Confirmar Apertura
            </button>
          </form>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
