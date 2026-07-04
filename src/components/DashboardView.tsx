import React from 'react';
import { Briefcase, Receipt, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import type { Project, CalendarEvent, BudgetItem } from '../types';
import { projectColorOf } from '../lib/projectColor';

interface DashboardViewProps {
  projects: Project[];
  budgets: Record<number | string, BudgetItem[]>;
  events: CalendarEvent[];
  setSelectedProjectId: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export const DashboardView = ({ projects, budgets, events, setSelectedProjectId, setActiveTab }: DashboardViewProps) => {
  const urgentEvents = events
    .filter(e => e.status === 'urgente')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 6);

  const ongoingProjects = projects.filter(p => p.status === 'En curso');

  const goToProject = (projectId?: string) => {
    if (!projectId) return;
    setSelectedProjectId(projectId);
    setActiveTab('project-calendar');
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100/50 flex flex-col justify-between h-64 group hover:border-blue-200 transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Proyectos Activos</p>
            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><Briefcase size={20}/></div>
          </div>
          <h4 className="text-7xl font-black text-slate-900 tracking-tighter">{projects.length}</h4>
          <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">↑ Central de Control</p>
        </div>
        <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-slate-200 h-64 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Volumen Negocio</p>
            <div className="p-3 bg-slate-800 text-slate-400 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors"><Receipt size={20}/></div>
          </div>
          <h4 className="text-6xl font-black text-white tracking-tighter">
            {Object.values(budgets).flat().reduce((acc, curr: any) => acc + (curr.total || 0), 0).toLocaleString()}
            <span className="text-2xl text-blue-500 ml-1">€</span>
          </h4>
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Base Imponible Total</p>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100/50 h-64 flex flex-col justify-between group hover:border-rose-200 transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hitos Críticos</p>
            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors"><Clock size={20}/></div>
          </div>
          <h4 className="text-7xl font-black text-slate-900 tracking-tighter">
            {String(urgentEvents.length).padStart(2, '0')}
          </h4>
          <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">Tareas Urgentes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100/50 p-10">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle size={18} className="text-rose-500" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Avisos & Citas Urgentes</h3>
          </div>
          {urgentEvents.length === 0 ? (
            <p className="text-slate-400 text-sm font-medium">Sin avisos urgentes pendientes.</p>
          ) : (
            <div className="space-y-3">
              {urgentEvents.map(ev => {
                const project = projects.find(p => p.firebaseId === ev.projectId);
                return (
                  <button
                    key={ev.firebaseId || ev.id}
                    onClick={() => goToProject(project?.firebaseId)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-rose-50/60 hover:bg-rose-50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{ev.task}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {project?.name || 'Erkiale'} · {ev.startDate}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-rose-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100/50 p-10">
          <div className="flex items-center gap-2 mb-6">
            <Briefcase size={18} className="text-blue-500" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Proyectos en Curso</h3>
          </div>
          {ongoingProjects.length === 0 ? (
            <p className="text-slate-400 text-sm font-medium">No hay proyectos en curso.</p>
          ) : (
            <div className="space-y-3">
              {ongoingProjects.map(project => {
                const projColor = projectColorOf(project);
                return (
                  <button
                    key={project.firebaseId}
                    onClick={() => goToProject(project.firebaseId)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: projColor }} />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{project.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{project.clientName}</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
