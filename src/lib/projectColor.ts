import type { Project } from '../types';
import { PROJECT_COLORS } from '../data/constants';

// Stable color per project: stored in Firestore; fallback uses project.id (stable timestamp) for old projects
export const projectColorOf = (p: Project) =>
  p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length];

export const getProjectColor = (projects: Project[], projFirebaseId: string) => {
  const proj = projects.find(p => p.firebaseId === projFirebaseId || String(p.id) === projFirebaseId);
  return proj ? projectColorOf(proj) : PROJECT_COLORS[0];
};
