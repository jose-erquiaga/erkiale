import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { Project } from '../types';
import { PROJECT_COLORS } from '../data/constants';

export function useProjects(user: { uid: string } | null | undefined, selectedProjectId: string, setSelectedProjectId: (id: string) => void) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;

    const pathProjects = 'projects';
    const projectsQuery = collection(db, 'projects');
    const projectsUnsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as Project));
      setProjects(projectsList);
      if (projectsList.length > 0 && (selectedProjectId === '' || !projectsList.map(p => p.firebaseId).includes(selectedProjectId))) {
        setSelectedProjectId(projectsList[0].firebaseId || '');
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathProjects));

    return () => {
      projectsUnsubscribe();
    };
  }, [user]);

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.currentTarget);
    // Pick next color not already used; fall back to cycling if all 8 are taken
    const usedColors = new Set(projects.map(p => p.color).filter(Boolean));
    const nextColor = PROJECT_COLORS.find(c => !usedColors.has(c)) || PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
    const newProject = {
      id: Date.now(),
      name: formData.get('name') as string,
      clientName: formData.get('clientName') as string,
      clientCIF: formData.get('clientCIF') as string,
      clientAddress: formData.get('clientAddress') as string,
      clientEmail: formData.get('clientEmail') as string,
      clientPhone: formData.get('clientPhone') as string,
      status: 'Pendiente' as const,
      category: (formData.get('category') as string) || 'General',
      color: nextColor,
      ownerId: user.uid
    };
    try {
      await addDoc(collection(db, 'projects'), newProject);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
      return false;
    }
  };

  const handleUpdateProjectStatus = async (projectId: string | number, status: 'En curso' | 'Pendiente' | 'Finalizado') => {
    try {
      const projectDoc = projects.find(p => p.firebaseId === projectId || p.id === projectId);
      if (projectDoc?.firebaseId) {
        await updateDoc(doc(db, 'projects', projectDoc.firebaseId), { status });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
    }
  };

  return { projects, handleAddProject, handleUpdateProjectStatus };
}
