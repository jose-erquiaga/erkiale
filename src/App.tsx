/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Hammer,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Calendar as CalendarIcon,
  BookOpen,
  Receipt,
  Ticket,
  Briefcase,
  X,
  Camera,
  ArrowRight,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  Key,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';

import { scanDocument, ScanType } from './services/geminiService';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useCatalog } from './hooks/useCatalog';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useProjects } from './hooks/useProjects';
import { useProjectSubcollections } from './hooks/useProjectSubcollections';
import { projectColorOf, getProjectColor } from './lib/projectColor';
import { ProjectsView } from './components/ProjectsView';
import { CalendarWidget } from './components/CalendarWidget';
import { BudgetView } from './components/BudgetView';
import { BillingView } from './components/BillingView';
import { ExpensesView } from './components/ExpensesView';
import { CatalogView } from './components/CatalogView';
import { DashboardView } from './components/DashboardView';
import { db, auth, isFirebaseConfigured, isAdmin, OperationType, handleFirestoreError } from './lib/firebase';
import type { Project, CompanyInfo, CatalogItem, CalendarEvent, BudgetItem, ExpenseItem } from './types';
import { DEFAULT_COMPANY, DEFAULT_EXPENSE_CATEGORIES, PROJECT_COLORS } from './data/constants';
import { CATALOG_SEED, CATALOG_SEED_CATEGORIES, CATALOG_SEED_UNITS } from './data/catalogSeed';

/**
 * ReformasPro: A comprehensive management tool for renovation projects.
 */


const App = () => {
  // --- AUTH STATE ---
  const { user, authReady, handleLogin, handleLogout } = useAuth();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectSubTab, setProjectSubTab] = useState<'budget' | 'calendar'>('budget');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManagingLists, setIsManagingLists] = useState(false);

  const { categories, units, companyInfo, expenseCategories, saveNewCategory: saveNewCategoryFor, saveNewUnit: saveNewUnitFor } = useSettings(user);

  const { projects, handleAddProject: handleAddProjectFor, handleUpdateProjectStatus } = useProjects(user, selectedProjectId, setSelectedProjectId);
  const { events, saveEvent, handleDragOver, handleDrop } = useCalendarEvents(user);
  const {
    budgets,
    invoices,
    expenses,
    handleAddBudgetItem: handleAddBudgetItemFor,
    handleUpdateBudgetItem: handleUpdateBudgetItemFor,
    handleGenerateInvoice: handleGenerateInvoiceFor,
    handleUpdateInvoiceItem: handleUpdateInvoiceItemFor,
    handleSaveExpense,
    handleUpdateExpenseItem: handleUpdateExpenseItemFor,
  } = useProjectSubcollections(user, selectedProjectId, projects);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [addingEventDate, setAddingEventDate] = useState<string | null>(null);
  const [isAddingBudgetItem, setIsAddingBudgetItem] = useState(false);
  const [editingBudgetItem, setEditingBudgetItem] = useState<BudgetItem | null>(null);
  const [editingCatalogItem, setEditingCatalogItem] = useState<CatalogItem | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [tempCategory, setTempCategory] = useState('');
  const [tempUnit, setTempUnit] = useState('');
  const [isInvoiceVisible, setIsInvoiceVisible] = useState(false);
  const [editingCatName, setEditingCatName] = useState<{old:string;val:string}|null>(null);
  const [editingUnitName, setEditingUnitName] = useState<{old:string;val:string}|null>(null);
  const [editingInvoiceItem, setEditingInvoiceItem] = useState<BudgetItem | null>(null);
  const [editingExpenseItem, setEditingExpenseItem] = useState<ExpenseItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: any; type: string; label: string } | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSeedingCatalog, setIsSeedingCatalog] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyDraft, setCompanyDraft] = useState<CompanyInfo>(DEFAULT_COMPANY);

  const {
    catalog,
    isScanningCatalog,
    catalogScanError,
    setCatalogScanError,
    scannedCatalogPreview,
    setScannedCatalogPreview,
    isConfirmingCatalog,
    handleAddCatalogItem,
    handleUpdateCatalogItem: handleUpdateCatalogItemFor,
    handleCatalogScan,
    handleConfirmScannedCatalog,
  } = useCatalog(user, categories, units);

  // --- HANDLERS ---
  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    const success = await handleGenerateInvoiceFor();
    setIsGeneratingInvoice(false);
    if (success) setActiveTab('billing');
  };

  const handleUpdateInvoiceItem = async (e: React.FormEvent<HTMLFormElement>) => {
    await handleUpdateInvoiceItemFor(editingInvoiceItem, e);
    setEditingInvoiceItem(null);
  };

  const handleUpdateExpenseItem = async (e: React.FormEvent<HTMLFormElement>) => {
    await handleUpdateExpenseItemFor(editingExpenseItem, e);
    setEditingExpenseItem(null);
  };

  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const eventData = {
      id: editingEvent?.id || Date.now(),
      projectId: editingEvent?.projectId || (addingEventDate ? selectedProjectId : (projects[0]?.firebaseId || '')),
      firebaseProjectId: String(selectedProjectId),
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      worker: formData.get('worker') as string,
      task: formData.get('task') as string,
      status: formData.get('status') as 'pendiente' | 'urgente'
    };

    await saveEvent(eventData, editingEvent?.firebaseId);
    setEditingEvent(null);
    setAddingEventDate(null);
  };

  const handleAddBudgetItem = async (catalogItemId: string, qty: number) => {
    const success = await handleAddBudgetItemFor(catalog, catalogItemId, qty);
    if (success) setIsAddingBudgetItem(false);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    const { id, type } = deleteConfirmation;

    try {
      if (type === 'project') {
        const projectIdStr = String(id);
        await deleteDoc(doc(db, 'projects', projectIdStr));
        if (selectedProjectId === id) {
          const remainingProjects = projects.filter(p => p.firebaseId !== id);
          setSelectedProjectId(remainingProjects.length > 0 ? (remainingProjects[0].firebaseId || '') : '');
        }
      } else if (type === 'budget') {
        await deleteDoc(doc(db, 'projects', String(selectedProjectId), 'budget_items', String(id)));
      } else if (type === 'invoice') {
        await deleteDoc(doc(db, 'projects', String(selectedProjectId), 'invoice_items', String(id)));
      } else if (type === 'expense') {
        await deleteDoc(doc(db, 'projects', String(selectedProjectId), 'expense_items', String(id)));
      } else if (type === 'event') {
        await deleteDoc(doc(db, 'calendar_events', String(id)));
      } else if (type === 'catalog') {
        await deleteDoc(doc(db, 'catalog', String(id)));
      } else if (type === 'category') {
        const newCats = categories.filter(c => c !== id);
        await setDoc(doc(db, 'settings', 'global'), { categories: newCats, units }, { merge: true });
      } else if (type === 'unit') {
        const newUnits = units.filter(u => u !== id);
        await setDoc(doc(db, 'settings', 'global'), { categories, units: newUnits }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${type}/${id}`);
    }

    setDeleteConfirmation(null);
  };

  const handleUpdateBudgetItem = async (e: React.FormEvent<HTMLFormElement>) => {
    await handleUpdateBudgetItemFor(editingBudgetItem, e);
    setEditingBudgetItem(null);
  };

  const handleUpdateCatalogItem = async (e: React.FormEvent<HTMLFormElement>) => {
    await handleUpdateCatalogItemFor(editingCatalogItem, e);
    setEditingCatalogItem(null);
  };

  const handleSeedCatalog = async () => {
    if (!isAdmin()) { alert("Solo el administrador puede realizar esta acción."); return; }
    if (!confirm(`¿Poblar el catálogo con ${CATALOG_SEED.length} partidas en ${CATALOG_SEED_CATEGORIES.length} categorías?\n\nSe añadirán a los items existentes (no se borrará nada).`)) return;
    setIsSeedingCatalog(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        categories: CATALOG_SEED_CATEGORIES,
        units: CATALOG_SEED_UNITS
      }, { merge: true });
      let count = 0;
      let errors = 0;
      for (const item of CATALOG_SEED) {
        try {
          await addDoc(collection(db, 'catalog'), { ...item, id: Date.now() + Math.random() });
          count++;
        } catch {
          errors++;
        }
      }
      if (errors > 0) {
        alert(`Catálogo poblado con ${count} partidas (${errors} fallaron). Revisa la conexión.`);
      } else {
        alert(`✓ Catálogo poblado: ${count} partidas en ${CATALOG_SEED_CATEGORIES.length} categorías.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'catalog');
    } finally {
      setIsSeedingCatalog(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!isAdmin()) {
      alert("Solo el administrador puede realizar esta acción.");
      return;
    }
    
    if (!confirm("¿ESTÁS SEGURO? Se eliminarán TODOS los proyectos, partidas, gastos y el catálogo de precios por completo. Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      // 1. Clear Catalog
      for (const item of catalog) {
        if (item.firebaseId) await deleteDoc(doc(db, 'catalog', item.firebaseId));
      }

      // 2. Clear Projects (and subcollections)
      for (const project of projects) {
        const projId = project.firebaseId || String(project.id);
        // Note: Subcollections need to be deleted manually if we want thorough cleaning
        // but for a "reset", deleting projects is the main part.
        // Usually you'd use a Cloud Function for recursive delete, 
        // but here we do a best effort from client.
        const budgetSnap = await getDocs(collection(db, 'projects', projId, 'budget_items'));
        for (const d of budgetSnap.docs) await deleteDoc(d.ref);
        
        const invoiceSnap = await getDocs(collection(db, 'projects', projId, 'invoice_items'));
        for (const d of invoiceSnap.docs) await deleteDoc(d.ref);

        const expenseSnap = await getDocs(collection(db, 'projects', projId, 'expense_items'));
        for (const d of expenseSnap.docs) await deleteDoc(d.ref);

        await deleteDoc(doc(db, 'projects', projId));
      }

      // 3. Clear Events
      for (const event of events) {
        if (event.firebaseId) await deleteDoc(doc(db, 'calendar_events', event.firebaseId));
      }

      // 4. Reset Settings
      await setDoc(doc(db, 'settings', 'global'), {
        categories: ['Pintura', 'Escayola', 'Suelos', 'Baños', 'Cocinas', 'Fontanería', 'Electricidad'],
        units: ['m2', 'ml', 'ud', 'litros', 'm3', 'kg']
      });

      alert("Base de datos reiniciada con éxito.");
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'all');
    }
  };
  const saveNewCategory = async () => {
    await saveNewCategoryFor(tempCategory);
    setTempCategory('');
    setIsAddingCategory(false);
  };

  const saveNewUnit = async () => {
    await saveNewUnitFor(tempUnit);
    setTempUnit('');
    setIsAddingUnit(false);
  };

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    const success = await handleAddProjectFor(e);
    if (success) setIsModalOpen(false);
  };

  const selectedProject = projects.find(p => p.firebaseId === selectedProjectId) || projects[0] || null;

  const activeColor = selectedProject ? projectColorOf(selectedProject) : PROJECT_COLORS[0];

  // --- COMPONENTS ---

  const Sidebar = () => (
    <div className="w-64 bg-[#0F172A] h-screen text-white flex flex-col fixed left-0 top-0 z-50 shadow-2xl overflow-y-auto border-r border-slate-800">
      {/* Logo */}
      <div className="p-6 pb-4 border-b border-slate-800 flex flex-col gap-1">
        <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight text-white italic">
          <Hammer size={24} style={{color: activeColor}} /> ERKIALE<span style={{color: activeColor}}> S.L</span>
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Gestión de Obras</p>
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
            {projects.map((p, i) => (
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
          { id: 'catalog', label: 'Catálogo Precios', icon: BookOpen },
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
            <>
              <button
                onClick={handleSeedCatalog}
                disabled={isSeedingCatalog}
                className="w-full mt-2 flex items-center gap-3 p-3 rounded-xl text-emerald-600 hover:text-white hover:bg-emerald-800/40 transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BookOpen size={16} /> {isSeedingCatalog ? 'Poblando...' : 'Poblar Catálogo'}
              </button>
              <button
                onClick={handleResetDatabase}
                className="w-full mt-1 flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:text-white hover:bg-slate-800 transition-all text-[9px] font-black uppercase tracking-widest"
              >
                <Database size={16} /> Reiniciar Datos
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );

  // --- MAIN RENDER ---
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="p-6 bg-white rounded-full shadow-xl shadow-blue-100 border border-slate-100">
            <Hammer className="text-blue-600 animate-pulse" size={48} />
          </div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Cargando ERKIALE...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-900/40 blur-[120px] rounded-full -ml-48 -mb-48"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-12 rounded-[3.5rem] shadow-2xl relative z-10 text-center"
        >
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-blue-50 rounded-[2.5rem] text-blue-600">
              <Key size={48} />
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight italic">ERKIALE<span className="text-blue-600"> S.L</span></h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-12">Sistema de Gestión Industrial</p>
          
          <button 
            onClick={handleLogin}
            className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:translate-y-[-2px] transition-all"
          >
            <LogIn size={20} /> Entrar con Google
          </button>
          
          <p className="mt-8 text-slate-400 text-[10px] font-medium leading-relaxed">
            Acceso restringido para personal autorizado de ERKIALE. Para soporte técnico contacte con administración.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100 selection:text-blue-700 flex">
      {/* MODAL: DELETE CONFIRMATION */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmation(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2rem] p-10 w-full max-w-md relative z-10 shadow-2xl">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="p-4 bg-rose-50 text-rose-500 rounded-full">
                  <AlertCircle size={48} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">¿Confirmar eliminación?</h3>
                  <p className="text-slate-500 text-sm font-medium italic">"{deleteConfirmation.label}"</p>
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setDeleteConfirmation(null)} className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                  <button onClick={confirmDelete} className="flex-1 px-6 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100">Eliminar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT BUDGET ITEM */}
      <AnimatePresence>
        {editingBudgetItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingBudgetItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">Editar Partida</h3>
                  <button onClick={() => setEditingBudgetItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateBudgetItem} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                    <input name="concept" defaultValue={editingBudgetItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cantidad ({editingBudgetItem.unit})</label>
                       <input name="qty" type="number" step="0.01" min="0.01" defaultValue={editingBudgetItem.qty} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Ud (€)</label>
                       <input name="price" type="number" step="0.01" min="0" defaultValue={editingBudgetItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 mt-2">Guardar Cambios</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD/EDIT CALENDAR EVENT */}
      <AnimatePresence>
        {(addingEventDate || editingEvent) && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setAddingEventDate(null); setEditingEvent(null); }} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">{editingEvent ? 'Editar Evento' : 'Añadir Evento'}</h3>
                  <button onClick={() => { setAddingEventDate(null); setEditingEvent(null); }} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveEvent} className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha</label>
                       <input name="date" type="date" defaultValue={editingEvent?.date || addingEventDate || ''} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hora</label>
                         <input name="time" type="time" defaultValue={editingEvent?.time || '08:00'} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prioridad</label>
                         <select name="status" defaultValue={editingEvent?.status || 'pendiente'} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                            <option value="pendiente">Pendiente</option>
                            <option value="urgente">Urgente</option>
                         </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Responsable / Operario</label>
                       <input name="worker" defaultValue={editingEvent?.worker || ''} placeholder="Ej: Pintor, Fontanero..." required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tarea / Descripción</label>
                       <textarea name="task" defaultValue={editingEvent?.task || ''} placeholder="Describe la tarea..." required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all min-h-[100px]" />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2">
                    {editingEvent && (
                      <button 
                        type="button" 
                        onClick={() => { setDeleteConfirmation({ id: editingEvent.firebaseId, type: 'event', label: editingEvent.task }); setEditingEvent(null); }}
                        className="flex-1 border border-rose-200 text-rose-500 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all"
                      >
                        Eliminar
                      </button>
                    )}
                    <button type="submit" className="flex-[2] bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                      {editingEvent ? 'Guardar Cambios' : 'Añadir al Calendario'}
                    </button>
                  </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT EXPENSE ITEM */}
      <AnimatePresence>
        {editingExpenseItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingExpenseItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">Editar Gasto</h3>
                  <button onClick={() => setEditingExpenseItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateExpenseItem} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                    <input name="concept" defaultValue={editingExpenseItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría</label>
                       <select name="category" defaultValue={editingExpenseItem.category} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                         {expenseCategories.map(c => <option key={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha</label>
                       <input name="date" type="date" defaultValue={editingExpenseItem.date} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cant.</label>
                       <input name="qty" type="number" step="0.01" min="0.01" defaultValue={editingExpenseItem.qty} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ud.</label>
                       <input name="unit" defaultValue={editingExpenseItem.unit} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio €/u</label>
                       <input name="price" type="number" step="0.01" min="0" defaultValue={editingExpenseItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 mt-2">Guardar Cambios</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT INVOICE ITEM */}
      <AnimatePresence>
        {editingInvoiceItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingInvoiceItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">Editar Partida Factura</h3>
                  <button onClick={() => setEditingInvoiceItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateInvoiceItem} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                    <input name="concept" defaultValue={editingInvoiceItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cantidad ({editingInvoiceItem.unit})</label>
                       <input name="qty" type="number" step="0.01" min="0.01" defaultValue={editingInvoiceItem.qty} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Ud (€)</label>
                       <input name="price" type="number" step="0.01" min="0" defaultValue={editingInvoiceItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 mt-2">Guardar Cambios Factura</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT CATALOG ITEM */}
      <AnimatePresence>
        {editingCatalogItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingCatalogItem(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-900">Editar Catálogo</h3>
                  <button onClick={() => setEditingCatalogItem(null)} className="text-slate-400 hover:text-slate-900"><X size={20}/></button>
                </div>
                <form onSubmit={handleUpdateCatalogItem} className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                    <input name="concept" defaultValue={editingCatalogItem.concept} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unidad</label>
                       <select name="unit" defaultValue={editingCatalogItem.unit} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none">
                          {units.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Precio Ud (€)</label>
                       <input name="price" type="number" step="0.01" min="0" defaultValue={editingCatalogItem.price} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 mt-2">Actualizar Maestro</button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SCANNER CATALOG PREVIEW */}
      <AnimatePresence>
        {scannedCatalogPreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Revisar Items Escaneados</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{scannedCatalogPreview.length} ítems detectados — edita antes de guardar</p>
                </div>
                <button onClick={() => setScannedCatalogPreview(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200"><X size={18}/></button>
              </div>
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
                      <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                      <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidad</th>
                      <th className="p-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio €</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {scannedCatalogPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <input value={item.concept} onChange={e => setScannedCatalogPreview(prev => prev!.map((it, i) => i===idx ? {...it, concept: e.target.value} : it))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100"/>
                        </td>
                        <td className="p-3">
                          <select value={item.category} onChange={e => setScannedCatalogPreview(prev => prev!.map((it, i) => i===idx ? {...it, category: e.target.value} : it))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            {!categories.includes(item.category) && item.category && <option value={item.category}>{item.category} (nueva)</option>}
                          </select>
                        </td>
                        <td className="p-3">
                          <select value={item.unit} onChange={e => setScannedCatalogPreview(prev => prev!.map((it, i) => i===idx ? {...it, unit: e.target.value} : it))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                            {!units.includes(item.unit) && item.unit && <option value={item.unit}>{item.unit} (nueva)</option>}
                          </select>
                        </td>
                        <td className="p-3">
                          <input type="number" value={item.price} onChange={e => setScannedCatalogPreview(prev => prev!.map((it, i) => i===idx ? {...it, price: parseFloat(e.target.value)||0} : it))}
                            className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 text-right"/>
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => setScannedCatalogPreview(prev => prev!.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"><X size={14}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/30">
                <button onClick={() => setScannedCatalogPreview(null)}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
                  Cancelar
                </button>
                <button onClick={handleConfirmScannedCatalog} disabled={scannedCatalogPreview.length === 0 || isConfirmingCatalog}
                  className="px-8 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-slate-300 disabled:cursor-not-allowed">
                  {isConfirmingCatalog ? 'Guardando...' : `Guardar ${scannedCatalogPreview.length} ítem${scannedCatalogPreview.length !== 1 ? 's' : ''} en Catálogo`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: INVOICE VIEW */}
      <AnimatePresence>
        {isInvoiceVisible && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6 bg-[#0F172A]/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="bg-white w-full max-w-4xl min-h-screen md:min-h-[auto] md:rounded-[2.5rem] shadow-2xl relative">
              <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur z-20 print:hidden md:rounded-t-[2.5rem]">
                <h3 className="text-sm font-black uppercase tracking-widest">Vista Previa de Factura</h3>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const content = document.getElementById('invoice-content');
                    if (!content) return;
                    const pw = window.open('', '_blank', 'width=900,height=700');
                    if (!pw) return;
                    const pdoc = pw.document;
                    pdoc.open();
                    pdoc.write('<!DOCTYPE html>');
                    pdoc.close();
                    pdoc.documentElement.lang = 'es';
                    const head = pdoc.head;
                    const meta = pdoc.createElement('meta'); meta.setAttribute('charset', 'UTF-8'); head.appendChild(meta);
                    const title = pdoc.createElement('title'); title.textContent = 'Erkiale'; head.appendChild(title);
                    const tw = pdoc.createElement('script'); tw.src = 'https://cdn.tailwindcss.com'; head.appendChild(tw);
                    const style = pdoc.createElement('style'); style.textContent = '@page{size:A4 portrait;margin:12mm 14mm;}body{font-family:sans-serif;background:white;}'; head.appendChild(style);
                    pdoc.body.appendChild(content.cloneNode(true));
                    const trigger = pdoc.createElement('script');
                    trigger.textContent = 'window.onload=function(){setTimeout(function(){window.print();},1200);};';
                    pdoc.body.appendChild(trigger);
                  }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-100">
                    <FileText size={14}/> Imprimir / PDF
                  </button>
                  <button onClick={() => setIsInvoiceVisible(false)} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all">
                    <X size={20}/>
                  </button>
                </div>
              </div>
              
              {(() => {
                const isInvoice = activeTab === 'billing';
                const docItems = (isInvoice ? invoices : budgets)[selectedProjectId] || [];
                const baseImponible = docItems.reduce((acc, curr) => acc + curr.total, 0);
                const iva = baseImponible * 0.21;
                const total = baseImponible * 1.21;
                const docYear = new Date().getFullYear();
                const docNum = String(selectedProject?.id || 0).slice(-4);
                const docDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                return (
                <div id="invoice-content" className="p-12 text-slate-900 bg-white min-h-[29.7cm] font-sans">

                  {/* Header: Logo + Company */}
                  <div className="flex justify-between items-start mb-8">
                    {/* EH Logo SVG - recreated from corporate identity */}
                    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" style={{width:'112px',height:'80px',display:'block'}}>
                      {/* Grey left panel */}
                      <rect x="12" y="6" width="82" height="128" fill="#cccccc"/>
                      {/* Navy blue right panel */}
                      <rect x="94" y="6" width="94" height="128" fill="#1e3a8a"/>

                      {/* E letter — left panel, white fill with dark stroke (outline effect) */}
                      {/* Vertical bar */}
                      <rect x="18" y="18" width="13" height="104" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                      {/* Top horizontal */}
                      <rect x="18" y="18" width="58" height="13" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                      {/* Middle horizontal (shorter) */}
                      <rect x="18" y="62" width="44" height="11" fill="white" stroke="#1a1a1a" strokeWidth="1"/>
                      {/* Bottom horizontal */}
                      <rect x="18" y="109" width="58" height="13" fill="white" stroke="#1a1a1a" strokeWidth="1"/>

                      {/* H letter — right panel, white on blue */}
                      {/* Left vertical */}
                      <rect x="104" y="18" width="13" height="104" fill="white"/>
                      {/* Right vertical */}
                      <rect x="165" y="18" width="13" height="104" fill="white"/>
                      {/* Crossbar */}
                      <rect x="104" y="62" width="74" height="11" fill="white"/>

                      {/* Corner brackets — outer decorative frame */}
                      <polyline points="2,22 2,2 22,2" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="square"/>
                      <polyline points="2,118 2,138 22,138" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="square"/>
                      <polyline points="198,22 198,2 178,2" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="square"/>
                      <polyline points="198,118 198,138 178,138" fill="none" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="square"/>
                    </svg>
                    <div className="text-right text-[11px] leading-relaxed text-slate-700">
                      <p className="text-sm font-bold text-slate-900 mb-0.5">{companyInfo.name}</p>
                      {companyInfo.cif && <p>{companyInfo.cif}</p>}
                      {companyInfo.address && <p>{companyInfo.address}</p>}
                      {companyInfo.city && <p>{companyInfo.city}</p>}
                      {companyInfo.phone && <p>Telf. {companyInfo.phone}</p>}
                      {companyInfo.email && <p>{companyInfo.email}</p>}
                    </div>
                  </div>

                  {/* Thin separator */}
                  <div className="border-t border-slate-300 mb-8" />

                  {/* Cliente + Factura/Presupuesto */}
                  <div className="grid grid-cols-2 gap-12 mb-8">
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-3 uppercase">Cliente</p>
                      <p className="text-[12px] font-black text-slate-900 uppercase mb-1">{selectedProject?.clientName || '—'}</p>
                      <div className="text-[11px] leading-snug text-slate-700 space-y-0.5">
                        <p>{selectedProject?.clientCIF || ''}</p>
                        <p>{selectedProject?.clientAddress || ''}</p>
                        {selectedProject?.clientEmail && <p className="lowercase">{selectedProject.clientEmail}</p>}
                        {selectedProject?.clientPhone && <p>{selectedProject.clientPhone}</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-3 uppercase">{isInvoice ? 'Factura' : 'Presupuesto'}</p>
                      <table className="text-[11px] w-full">
                        <tbody>
                          <tr>
                            <td className="text-slate-600 py-0.5 pr-4">Nº de {isInvoice ? 'factura' : 'presupuesto'}</td>
                            <td className="font-bold text-right">{docYear}/{docNum}</td>
                          </tr>
                          <tr>
                            <td className="text-slate-600 py-0.5 pr-4">Fecha {isInvoice ? 'factura' : 'presupuesto'}</td>
                            <td className="font-bold text-right">{docDate}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Blue separator line */}
                  <div className="h-0.5 bg-blue-500 mb-0" />

                  {/* Items table */}
                  <table className="w-full text-[11px] mb-8">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-3 text-left font-semibold text-slate-600">Conceptos</th>
                        <th className="py-3 text-right font-semibold text-slate-600 w-16">Cant.</th>
                        <th className="py-3 text-right font-semibold text-slate-600 w-28">Precio uni.</th>
                        <th className="py-3 text-right font-semibold text-slate-600 w-16">Imp.</th>
                        <th className="py-3 text-right font-semibold text-slate-600 w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docItems.map(item => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-4 pr-4">
                            <p className="font-bold text-slate-900 uppercase">{item.concept}</p>
                            {item.description && (
                              <p className="text-[10px] text-slate-600 mt-1 leading-snug whitespace-pre-line">{item.description}</p>
                            )}
                          </td>
                          <td className="py-4 text-right text-slate-700">{item.qty.toFixed(2)}</td>
                          <td className="py-4 text-right text-slate-700">{item.price.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                          <td className="py-4 text-right text-slate-700">21%</td>
                          <td className="py-4 text-right font-bold text-slate-900">{(item.price * item.qty * 1.21).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Blue separator line */}
                  <div className="h-0.5 bg-blue-500 mb-6" />

                  {/* Totals */}
                  <div className="flex justify-end mb-12">
                    <div className="w-72 text-[12px] space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Base Imponible</span>
                        <span className="font-medium">{baseImponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-slate-200">
                        <span className="text-slate-600">IVA 21%</span>
                        <span className="font-medium">{iva.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="font-bold text-slate-900">Total</span>
                        <span className="font-bold text-slate-900">{total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment methods */}
                  <div className="mb-12 text-[11px]">
                    <p className="font-semibold text-slate-700 mb-1">Métodos de pago</p>
                    <p className="text-slate-600">Transferencia bancaria al número de cuenta <span className="font-bold text-slate-900">ES38 0182 1078 8602 0152 6785</span></p>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">
                    <span>B92898287</span>
                    <span>1 / 1</span>
                  </div>
                </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Sidebar />
      
      <main className="ml-64 p-12 max-w-[1600px]">
        {/* Page Header */}
        <header className="mb-12 flex justify-between items-end">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl font-black text-[#0F172A] tracking-tighter leading-none mb-3">
              {activeTab === 'catalog' && "Catálogo Precios"}
              {activeTab === 'budgets' && "Presupuesto Obra"}
              {activeTab === 'global-calendar' && "Agenda de Empresa"}
              {activeTab === 'dashboard' && "Panel General"}
              {activeTab === 'billing' && "Módulo Facturación"}
              {activeTab === 'expenses' && "Tickets y Gastos"}
              {activeTab === 'projects' && "Listado Proyectos"}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
                <div className="h-1 w-12 rounded-full" style={{background: activeColor}}></div>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">
                  Sistema de Gestión ERKIALE
                </p>
                {selectedProject && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{background: `${activeColor}18`, color: activeColor}}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{background: activeColor}} />
                    {selectedProject.name}
                  </span>
                )}
            </div>
          </motion.div>
          
          {(activeTab === 'projects' || activeTab === 'dashboard') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="text-white px-10 py-5 rounded-[1.75rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 transition-all"
              style={{
                background: activeColor,
                boxShadow: `0 8px 30px ${activeColor}50`,
                borderBottom: `4px solid ${activeColor}cc`
              }}
            >
              <Plus size={22} className="stroke-[3]" /> Crear Proyecto
            </motion.button>
          )}
        </header>

        {/* Tab Content Wrapper */}
        <div className="min-h-[70vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + selectedProjectId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'projects' && (
                <ProjectsView
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  setSelectedProjectId={setSelectedProjectId}
                  setActiveTab={setActiveTab}
                  handleUpdateProjectStatus={handleUpdateProjectStatus}
                  setDeleteConfirmation={setDeleteConfirmation}
                />
              )}
              
              {activeTab === 'catalog' && (
                <CatalogView
                  catalog={catalog}
                  categories={categories}
                  units={units}
                  companyInfo={companyInfo}
                  expenseCategories={expenseCategories}
                  isScanningCatalog={isScanningCatalog}
                  catalogScanError={catalogScanError}
                  setCatalogScanError={setCatalogScanError}
                  handleCatalogScan={handleCatalogScan}
                  isManagingLists={isManagingLists}
                  setIsManagingLists={setIsManagingLists}
                  isAddingCategory={isAddingCategory}
                  setIsAddingCategory={setIsAddingCategory}
                  tempCategory={tempCategory}
                  setTempCategory={setTempCategory}
                  saveNewCategory={saveNewCategory}
                  isAddingUnit={isAddingUnit}
                  setIsAddingUnit={setIsAddingUnit}
                  tempUnit={tempUnit}
                  setTempUnit={setTempUnit}
                  saveNewUnit={saveNewUnit}
                  editingCatName={editingCatName}
                  setEditingCatName={setEditingCatName}
                  editingUnitName={editingUnitName}
                  setEditingUnitName={setEditingUnitName}
                  setDeleteConfirmation={setDeleteConfirmation}
                  isEditingCompany={isEditingCompany}
                  setIsEditingCompany={setIsEditingCompany}
                  companyDraft={companyDraft}
                  setCompanyDraft={setCompanyDraft}
                  handleAddCatalogItem={handleAddCatalogItem}
                  setEditingCatalogItem={setEditingCatalogItem}
                />
              )}

              {activeTab === 'budgets' && (
                <div>
                  <div className="flex gap-10 mb-10 border-b border-slate-200">
                    <button 
                      onClick={() => setProjectSubTab('budget')}
                      className={`pb-5 px-1 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${projectSubTab === 'budget' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Control Financiero
                      {projectSubTab === 'budget' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                    </button>
                    <button 
                      onClick={() => setProjectSubTab('calendar')}
                      className={`pb-5 px-1 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${projectSubTab === 'calendar' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Cronograma Obra
                      {projectSubTab === 'calendar' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                    </button>
                  </div>
                  {projectSubTab === 'budget' ? (
                    <BudgetView
                      project={selectedProject}
                      selectedProjectId={selectedProjectId}
                      budgets={budgets}
                      expenses={expenses}
                      categories={categories}
                      catalog={catalog}
                      isAddingBudgetItem={isAddingBudgetItem}
                      setIsAddingBudgetItem={setIsAddingBudgetItem}
                      handleAddBudgetItem={handleAddBudgetItem}
                      setEditingBudgetItem={setEditingBudgetItem}
                      setDeleteConfirmation={setDeleteConfirmation}
                      setIsInvoiceVisible={setIsInvoiceVisible}
                      handleGenerateInvoice={handleGenerateInvoice}
                      isGeneratingInvoice={isGeneratingInvoice}
                    />
                  ) : (
                    <CalendarWidget
                      projectId={selectedProjectId}
                      currentDate={currentDate}
                      setCurrentDate={setCurrentDate}
                      events={events}
                      projects={projects}
                      activeColor={activeColor}
                      handleDragOver={handleDragOver}
                      handleDrop={handleDrop}
                      setAddingEventDate={setAddingEventDate}
                      setEditingEvent={setEditingEvent}
                    />
                  )}
                </div>
              )}

              {activeTab === 'global-calendar' && (
                <CalendarWidget
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  events={events}
                  projects={projects}
                  activeColor={activeColor}
                  handleDragOver={handleDragOver}
                  handleDrop={handleDrop}
                  setAddingEventDate={setAddingEventDate}
                  setEditingEvent={setEditingEvent}
                />
              )}

              {activeTab === 'billing' && (
                <BillingView
                  project={selectedProject}
                  selectedProjectId={selectedProjectId}
                  invoices={invoices}
                  setActiveTab={setActiveTab}
                  setEditingInvoiceItem={setEditingInvoiceItem}
                  setDeleteConfirmation={setDeleteConfirmation}
                  setIsInvoiceVisible={setIsInvoiceVisible}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpensesView
                  project={selectedProject}
                  selectedProjectId={selectedProjectId}
                  expenses={expenses}
                  expenseCategories={expenseCategories}
                  setEditingExpenseItem={setEditingExpenseItem}
                  setDeleteConfirmation={setDeleteConfirmation}
                />
              )}

              {activeTab === 'dashboard' && (
                <DashboardView projects={projects} budgets={budgets} events={events} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* MODAL: NEW PROJECT */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden relative z-10 border border-white/20"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nuevo Expediente</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Apertura de ficha de obra</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-3 bg-white text-slate-400 rounded-2xl hover:text-slate-900 transition-all border border-slate-100"
                >
                    <X size={24}/>
                </button>
              </div>
              <form onSubmit={handleAddProject} className="p-10 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Título del Proyecto</label>
                  <input name="name" required type="text" placeholder="Ej: Reforma Planta 3 Calle Serrano" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nombre Cliente / Empresa</label>
                    <input name="clientName" required type="text" placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">CIF / NIF</label>
                    <input name="clientCIF" required type="text" placeholder="Ej: 12345678Z" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Dirección Fiscal / Obra</label>
                  <input name="clientAddress" required type="text" placeholder="Calle, Número, CP, Ciudad" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email de Contacto</label>
                    <input name="clientEmail" required type="email" placeholder="cliente@ejemplo.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Teléfono</label>
                    <input name="clientPhone" required type="tel" placeholder="Ej: 600000000" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Categoría Obra</label>
                  <select name="category" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm">
                    <option value="Vivienda">Vivienda</option>
                    <option value="Cocina">Cocina</option>
                    <option value="Baño">Baño</option>
                    <option value="Local">Local Comercial</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white p-6 rounded-[1.75rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-blue-200 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all mt-4">
                  Confirmar Apertura
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          .print\:hidden { display: none !important; }
          body { background: white !important; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default App;
