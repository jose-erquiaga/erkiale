import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Project, CalendarEvent } from '../types';
import { ERKIALE_PROJECT_ID } from '../types';
import { getProjectColor } from '../lib/projectColor';

const ERKIALE_COLOR = '#334155';
const WEEKDAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

interface CalendarWidgetProps {
  projectId?: string | null;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  events: CalendarEvent[];
  projects: Project[];
  activeColor: string;
  setAddingEventDate: (date: string | null) => void;
  setAddingEventProjectId: (id: string | null) => void;
  setEditingEvent: (event: CalendarEvent | null) => void;
}

const eventColor = (ev: CalendarEvent, projects: Project[]) =>
  ev.projectId === ERKIALE_PROJECT_ID ? ERKIALE_COLOR : getProjectColor(projects, ev.projectId);

export const CalendarWidget = ({
  projectId = null,
  currentDate,
  setCurrentDate,
  events,
  projects,
  activeColor,
  setAddingEventDate,
  setAddingEventProjectId,
  setEditingEvent,
}: CalendarWidgetProps) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthStartStr = `${monthStr}-01`;
  const monthEndStr = `${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  const filteredEvents = projectId
    ? events.filter(e => e.projectId === projectId)
    : events;

  const planningEvents = filteredEvents
    .filter(e => e.type === 'planning' && e.endDate && e.endDate >= monthStartStr && e.startDate <= monthEndStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const meetingsByDay = new Map<number, CalendarEvent[]>();
  filteredEvents
    .filter(e => e.type === 'meeting' && e.startDate.startsWith(monthStr))
    .forEach(e => {
      const day = parseInt(e.startDate.slice(8, 10), 10);
      if (!meetingsByDay.has(day)) meetingsByDay.set(day, []);
      meetingsByDay.get(day)!.push(e);
    });

  const dayOfMonth = (dateStr: string) => parseInt(dateStr.slice(8, 10), 10);

  const handleAddEvent = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setAddingEventProjectId(projectId || ERKIALE_PROJECT_ID);
    setAddingEventDate(todayStr.startsWith(monthStr) ? todayStr : monthStartStr);
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="p-8 border-b flex justify-between items-center bg-white">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{monthNames[month]} {year}</h3>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Planificación Operativa</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAddEvent} className="px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 text-white transition" style={{ background: activeColor }}><Plus size={16}/> Nuevo evento</button>
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition border border-slate-100 text-slate-600 shadow-sm"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition border border-slate-100 text-slate-600 shadow-sm"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: daysInMonth * 34 }}>
          {/* Day header row */}
          <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(34px, 1fr))` }}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isToday = new Date().toISOString().split('T')[0] === `${monthStr}-${String(day).padStart(2, '0')}`;
              const weekday = WEEKDAY_INITIALS[new Date(year, month, day).getDay()];
              return (
                <div key={day} className="py-3 text-center border-l border-slate-50 first:border-l-0">
                  <div className={`text-[10px] font-black mx-auto w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'text-white' : 'text-slate-600'}`} style={isToday ? { background: activeColor } : {}}>{day}</div>
                  <div className="text-[8px] font-bold text-slate-300 uppercase mt-0.5">{weekday}</div>
                </div>
              );
            })}
          </div>

          {/* Meetings row */}
          <div className="grid border-b border-slate-100 bg-slate-50/40 min-h-[2.5rem]" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(34px, 1fr))` }}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
              <div key={day} className="border-l border-slate-50 first:border-l-0 p-1 space-y-1">
                {(meetingsByDay.get(day) || []).map(ev => (
                  <button
                    key={ev.firebaseId}
                    onClick={() => setEditingEvent(ev)}
                    title={`${ev.startTime}-${ev.endTime} · ${ev.task}`}
                    className="w-full text-[7px] font-black text-white rounded px-1 py-0.5 truncate block"
                    style={{ background: eventColor(ev, projects) }}
                  >
                    {ev.startTime}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Planning rows (Gantt bars) */}
          <div className="divide-y divide-slate-50">
            {planningEvents.length === 0 ? (
              <p className="text-center text-slate-300 italic py-10 text-sm">Sin tareas de planificación este mes.</p>
            ) : (
              planningEvents.map(ev => {
                const startCol = ev.startDate < monthStartStr ? 1 : dayOfMonth(ev.startDate);
                const endCol = (ev.endDate || ev.startDate) > monthEndStr ? daysInMonth : dayOfMonth(ev.endDate || ev.startDate);
                const color = eventColor(ev, projects);
                return (
                  <div key={ev.firebaseId} className="grid py-1.5" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(34px, 1fr))` }}>
                    <button
                      onClick={() => setEditingEvent(ev)}
                      className="text-left text-[9px] font-bold text-white rounded-lg px-2 py-1.5 truncate border-l-4"
                      style={{ gridColumn: `${startCol} / ${endCol + 1}`, background: `${color}dd`, borderLeftColor: ev.status === 'urgente' ? '#EF4444' : color }}
                      title={ev.task}
                    >
                      {ev.task}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
