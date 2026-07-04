import React from 'react';
import { Briefcase, Receipt, Clock } from 'lucide-react';
import type { Project, CalendarEvent, BudgetItem } from '../types';

interface DashboardViewProps {
  projects: Project[];
  budgets: Record<number | string, BudgetItem[]>;
  events: CalendarEvent[];
}

export const DashboardView = ({ projects, budgets, events }: DashboardViewProps) => (
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
          {String(events.filter(e => e.status === 'urgente').length).padStart(2, '0')}
        </h4>
        <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">Tareas Urgentes</p>
     </div>
  </div>
);
