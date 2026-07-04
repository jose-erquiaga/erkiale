import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CalendarEvent } from '../../types';

interface CalendarEventModalProps {
  addingEventDate: string | null;
  editingEvent: CalendarEvent | null;
  setAddingEventDate: (date: string | null) => void;
  setEditingEvent: (event: CalendarEvent | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
  handleSaveEvent: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const CalendarEventModal = ({
  addingEventDate,
  editingEvent,
  setAddingEventDate,
  setEditingEvent,
  setDeleteConfirmation,
  handleSaveEvent,
}: CalendarEventModalProps) => (
  <AnimatePresence>
    {(addingEventDate || editingEvent) && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setAddingEventDate(null); setEditingEvent(null); }} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
         <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{editingEvent ? 'Editar Evento' : 'Añadir Evento'}</h3>
              <button onClick={() => { setAddingEventDate(null); setEditingEvent(null); }} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveEvent} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha</label>
                   <input name="date" type="date" defaultValue={editingEvent?.date || addingEventDate || ''} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hora</label>
                     <input name="time" type="time" defaultValue={editingEvent?.time || '08:00'} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prioridad</label>
                     <select name="status" defaultValue={editingEvent?.status || 'pendiente'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                        <option value="pendiente">Pendiente</option>
                        <option value="urgente">Urgente</option>
                     </select>
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Responsable / Operario</label>
                   <input name="worker" defaultValue={editingEvent?.worker || ''} placeholder="Ej: Pintor, Fontanero..." required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tarea / Descripción</label>
                   <textarea name="task" defaultValue={editingEvent?.task || ''} placeholder="Describe la tarea..." required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all min-h-[100px]" />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => { setDeleteConfirmation({ id: editingEvent.firebaseId, type: 'event', label: editingEvent.task }); setEditingEvent(null); }}
                    className="flex-1 border border-rose-200 text-rose-500 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all"
                  >
                    Eliminar
                  </button>
                )}
                <button type="submit" className="flex-[2] bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                  {editingEvent ? 'Guardar Cambios' : 'Añadir al Calendario'}
                </button>
              </div>
            </form>
         </motion.div>
      </div>
    )}
  </AnimatePresence>
);
