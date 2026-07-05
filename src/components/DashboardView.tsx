import React, { useState } from 'react';
import { Briefcase, Receipt, Clock, ArrowRight, AlertTriangle, User, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Project, CalendarEvent, BudgetItem } from '../types';
import { projectColorOf } from '../lib/projectColor';

type ProjectStatusFilter = 'Pendiente' | 'En curso' | 'Finalizado';

const STATUS_TABS: ProjectStatusFilter[] = ['Pendiente', 'En curso', 'Finalizado'];

interface DashboardViewProps {
  projects: Project[];
  budgets: Record<number | string, BudgetItem[]>;
  events: CalendarEvent[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  setActiveTab: (tab: string) => void;
  handleUpdateProjectStatus: (projectId: string | number, status: 'En curso' | 'Pendiente' | 'Finalizado') => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
}

export const DashboardView = ({
  projects,
  budgets,
  events,
  selectedProjectId,
  setSelectedProjectId,
  setActiveTab,
  handleUpdateProjectStatus,
  setDeleteConfirmation,
}: DashboardViewProps) => {
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('En curso');

  const urgentEvents = events
    .filter(e => e.status === 'urgente')
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
    .slice(0, 6);

  const filteredProjects = projects.filter(p => p.status === statusFilter);

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

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100/50 p-10">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle size={18} className="text-rose-500" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Avisos & Citas Urgentes</h3>
        </div>
        {urgentEvents.length === 0 ? (
          <p className="text-slate-400 text-sm font-medium">Sin avisos urgentes pendientes.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-blue-500" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Estado de Proyectos</h3>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
            {STATUS_TABS.map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === status ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {status === 'Finalizado' ? 'Terminados' : status === 'En curso' ? 'En curso' : 'Pendientes'}
              </button>
            ))}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-16 text-center text-slate-400 font-bold">
            No hay proyectos en este estado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredProjects.map((project, idx) => {
              const projColor = projectColorOf(project);
              const isSelected = selectedProjectId === project.firebaseId;
              return (
                <motion.div
                  key={project.firebaseId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  onClick={() => goToProject(project.firebaseId)}
                  className="group bg-white rounded-[2.5rem] border transition-all duration-500 p-8 flex flex-col justify-between cursor-pointer hover:shadow-2xl hover:-translate-y-2"
                  style={{
                    borderColor: isSelected ? projColor : '#f1f5f9',
                    boxShadow: isSelected ? `0 0 0 4px ${projColor}20, 0 20px 40px ${projColor}15` : undefined,
                  }}
                >
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div
                        className="p-4 rounded-[1.5rem] transition-colors"
                        style={{
                          backgroundColor: isSelected ? projColor : `${projColor}15`,
                          color: isSelected ? 'white' : projColor,
                        }}
                      >
                        <Briefcase size={28} />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <select
                          value={project.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateProjectStatus(project.id, e.target.value as any)}
                          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ring-1 outline-none cursor-pointer appearance-none text-center ${
                            project.status === 'En curso' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' :
                            project.status === 'Pendiente' ? 'bg-slate-50 text-slate-600 ring-slate-100' :
                            'bg-slate-50 text-slate-400 ring-slate-100'
                          }`}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="En curso">En curso</option>
                          <option value="Finalizado">Finalizado</option>
                        </select>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmation({ id: project.firebaseId, type: 'project', label: project.name });
                          }}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <h3
                      className="text-2xl font-black text-slate-900 mb-2 leading-tight transition-colors"
                      style={isSelected ? {color: projColor} : {}}
                    >
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-8">
                      <User size={14} /> {project.clientName}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{background: projColor}} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{project.category}</span>
                    </div>
                    <span
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                      style={{color: projColor}}
                    >
                      Detalles <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
