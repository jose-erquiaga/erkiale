import React from 'react';
import { User, Mail, Phone, MapPin, FileText } from 'lucide-react';
import type { Project, CalendarEvent } from '../types';
import { CalendarWidget } from './CalendarWidget';

interface ProjectCalendarViewProps {
  project: Project | null;
  selectedProjectId: string;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  events: CalendarEvent[];
  projects: Project[];
  activeColor: string;
  setAddingEventDate: (date: string | null) => void;
  setAddingEventProjectId: (id: string | null) => void;
  setEditingEvent: (event: CalendarEvent | null) => void;
  setActiveTab: (tab: string) => void;
}

export const ProjectCalendarView = ({
  project,
  selectedProjectId,
  currentDate,
  setCurrentDate,
  events,
  projects,
  activeColor,
  setAddingEventDate,
  setAddingEventProjectId,
  setEditingEvent,
  setActiveTab,
}: ProjectCalendarViewProps) => (
  <div className="space-y-10">
    {project && (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: `${activeColor}15`, color: activeColor }}>
              <User size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{project.clientName}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{project.clientCIF}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('clients')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
          >
            <FileText size={14} /> Gestionar clientes
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-500 font-medium pt-6 border-t border-slate-50">
          <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-300" /> {project.clientAddress}</div>
          <div className="flex items-center gap-2"><Mail size={14} className="text-slate-300" /> {project.clientEmail}</div>
          <div className="flex items-center gap-2"><Phone size={14} className="text-slate-300" /> {project.clientPhone}</div>
        </div>
      </div>
    )}

    <CalendarWidget
      projectId={selectedProjectId}
      currentDate={currentDate}
      setCurrentDate={setCurrentDate}
      events={events}
      projects={projects}
      activeColor={activeColor}
      setAddingEventDate={setAddingEventDate}
      setAddingEventProjectId={setAddingEventProjectId}
      setEditingEvent={setEditingEvent}
    />
  </div>
);
