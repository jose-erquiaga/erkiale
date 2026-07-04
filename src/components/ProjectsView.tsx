import React from 'react';
import { Briefcase, User, X, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { Project } from '../types';
import { projectColorOf } from '../lib/projectColor';

interface ProjectsViewProps {
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  setActiveTab: (tab: string) => void;
  handleUpdateProjectStatus: (projectId: string | number, status: 'En curso' | 'Pendiente' | 'Finalizado') => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
}

export const ProjectsView = ({
  projects,
  selectedProjectId,
  setSelectedProjectId,
  setActiveTab,
  handleUpdateProjectStatus,
  setDeleteConfirmation,
}: ProjectsViewProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
    {projects.map((project, idx) => {
      const projColor = projectColorOf(project);
      const isSelected = selectedProjectId === project.firebaseId;
      return (
      <motion.div
        key={project.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: idx * 0.1 }}
        onClick={() => setSelectedProjectId(project.firebaseId || '')}
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProjectId(project.firebaseId || '');
              setActiveTab('budgets');
            }}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
            style={{color: projColor}}
          >
            Detalles <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
      );
    })}
  </div>
);
