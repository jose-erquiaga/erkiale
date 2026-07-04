import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import type { Project, CalendarEvent } from '../types';
import { getProjectColor } from '../lib/projectColor';

interface CalendarWidgetProps {
  projectId?: string | null;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  events: CalendarEvent[];
  projects: Project[];
  activeColor: string;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, date: string) => void;
  setAddingEventDate: (date: string | null) => void;
  setEditingEvent: (event: CalendarEvent | null) => void;
}

export const CalendarWidget = ({
  projectId = null,
  currentDate,
  setCurrentDate,
  events,
  projects,
  activeColor,
  handleDragOver,
  handleDrop,
  setAddingEventDate,
  setEditingEvent,
}: CalendarWidgetProps) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const filteredEvents = projectId
    ? events.filter(e => String(e.projectId) === projectId)
    : events;

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-32 bg-slate-50/50 border border-slate-100/50"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = filteredEvents.filter(e => e.date === dateStr);

    cells.push(
      <div
        key={d}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, dateStr)}
        onClick={() => setAddingEventDate(dateStr)}
        className="h-32 border border-slate-100 p-2 hover:bg-slate-50/60 transition-all relative group cursor-pointer"
      >
        <div className="flex justify-between items-center mb-1">
          {new Date().toISOString().split('T')[0] === dateStr ? (
            <span className="text-[10px] font-black text-white w-5 h-5 flex items-center justify-center rounded-full" style={{background: activeColor}}>{d}</span>
          ) : (
            <span className="text-[10px] font-black text-slate-300 group-hover:text-slate-600">{d}</span>
          )}
          <Plus size={10} className="text-slate-200 group-hover:text-slate-400" />
        </div>
        <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
          {dayEvents.map(ev => {
            const evColor = getProjectColor(projects, String(ev.projectId));
            return (
              <motion.div
                key={ev.id}
                draggable
                onDragStart={(e) => {
                  const dragEvent = e as unknown as React.DragEvent<HTMLDivElement>;
                  dragEvent.dataTransfer.setData('text/plain', ev.id.toString());
                  dragEvent.dataTransfer.effectAllowed = 'move';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingEvent(ev);
                }}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-[8px] p-1.5 rounded-lg truncate shadow-sm font-bold border-l-2 cursor-grab active:cursor-grabbing"
                style={{
                  backgroundColor: `${evColor}18`,
                  color: evColor,
                  borderLeftColor: ev.status === 'urgente' ? '#EF4444' : evColor,
                }}
              >
                <div className="flex justify-between items-center mb-0.5 pointer-events-none">
                  <span className="truncate flex-1">{ev.worker}</span>
                  <span className="opacity-60 ml-1 shrink-0">{ev.time}</span>
                </div>
                <div className="opacity-90 truncate pointer-events-none">{ev.task}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="p-8 border-b flex justify-between items-center bg-white">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{monthNames[month]} {year}</h3>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Planificación Operativa</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition border border-slate-100 text-slate-600 shadow-sm"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition border border-slate-100 text-slate-600 shadow-sm"><ChevronRight size={20}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center bg-slate-50/50 border-b border-slate-100">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
          <div key={d} className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">{cells}</div>
    </div>
  );
};
