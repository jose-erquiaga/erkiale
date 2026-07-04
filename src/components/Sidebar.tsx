import React from 'react';
import {
  LayoutDashboard,
  Hammer,
  ChevronRight,
  User,
  FileText,
  Calendar as CalendarIcon,
  Receipt,
  Ticket,
  Briefcase,
  LogOut,
  Database,
  Settings,
  Wallet,
} from 'lucide-react';
import type { Project } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';
import { projectColorOf } from '../lib/projectColor';
import { isAdmin } from '../lib/firebase';

interface SidebarProps {
  user: FirebaseUser;
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeColor: string;
  handleLogout: () => void;
  handleResetDatabase: () => void;
}

export const Sidebar = ({
  user,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  activeTab,
  setActiveTab,
  activeColor,
  handleLogout,
  handleResetDatabase,
}: SidebarProps) => (
  <div className="w-64 bg-[#0F172A] h-screen text-white flex flex-col fixed left-0 top-0 z-50 shadow-2xl overflow-y-auto border-r border-slate-800">
    {/* Logo */}
    <div className="p-6 pb-4 border-b border-slate-800 flex flex-col gap-1">
      <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight text-white italic">
        <Hammer size={24} style={{color: activeColor}} /> ERKIALE<span style={{color: activeColor}}> S.L</span>
      </h1>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Gestión de Obras</p>
    </div>

    {/* General — shared across all projects */}
    <div className="p-4 pb-3 space-y-1 border-b border-slate-800">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 px-1">General</p>
      {[
        { id: 'company-expenses', label: 'Gasto Erkiale', icon: Wallet },
        { id: 'structure', label: 'Catálogo', icon: Settings },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 text-sm font-semibold group ${activeTab === item.id ? 'text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          style={activeTab === item.id ? {backgroundColor: activeColor, boxShadow: `0 4px 20px ${activeColor}50`} : {}}
        >
          <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'} />
          {item.label}
        </button>
      ))}
    </div>

    {/* Project selector — top */}
    <div className="px-4 pt-4 pb-2">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Proyecto activo</p>
      <div className="relative rounded-2xl overflow-hidden" style={{boxShadow: `0 0 0 2px ${activeColor}50`}}>
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{background: activeColor}} />
        <select
          className="bg-slate-900 text-[11px] font-black w-full pl-4 pr-8 py-3.5 outline-none cursor-pointer appearance-none transition-colors"
          style={{color: activeColor}}
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.firebaseId} value={p.firebaseId} className="bg-[#0F172A] text-white">{p.name}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{color: activeColor}}>
          <ChevronRight size={13} className="rotate-90" />
        </div>
      </div>
      {/* Color dots — one per project */}
      {projects.length > 1 && (
        <div className="flex gap-1.5 mt-2 px-1">
          {projects.map((p) => (
            <button
              key={p.firebaseId}
              title={p.name}
              onClick={() => setSelectedProjectId(p.firebaseId || '')}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                background: projectColorOf(p),
                opacity: p.firebaseId === selectedProjectId ? 1 : 0.35,
                transform: p.firebaseId === selectedProjectId ? 'scale(1.4)' : 'scale(1)'
              }}
            />
          ))}
        </div>
      )}
    </div>

    {/* Nav */}
    <nav className="flex-1 p-4 space-y-1 mt-2">
      {[
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Proyectos', icon: Briefcase },
        { id: 'budgets', label: 'Presupuesto Activo', icon: FileText },
        { id: 'global-calendar', label: 'Calendario Global', icon: CalendarIcon },
        { id: 'billing', label: 'Facturación', icon: Receipt },
        { id: 'expenses', label: 'Gastos', icon: Ticket },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 text-sm font-semibold group ${activeTab === item.id ? 'text-white ring-1 ring-white/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          style={activeTab === item.id ? {backgroundColor: activeColor, boxShadow: `0 4px 20px ${activeColor}50`} : {}}
        >
          <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'} />
          {item.label}
        </button>
      ))}

      <div className="pt-8 mt-8 border-t border-slate-800 px-4">
        <div className="flex items-center gap-3 mb-6">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-full border-2 border-slate-700" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center" style={{color: activeColor}}>
              <User size={20} />
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-[10px] font-black text-white truncate">{user.displayName || 'Usuario'}</p>
            <p className="text-[9px] font-bold text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
        {isAdmin() && (
          <button
            onClick={handleResetDatabase}
            className="w-full mt-2 flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:text-white hover:bg-slate-800 transition-all text-[9px] font-black uppercase tracking-widest"
          >
            <Database size={16} /> Reiniciar Datos
          </button>
        )}
      </div>
    </nav>
  </div>
);
