/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Hammer, Plus, LogIn, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import {
  collection,
  doc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';

import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useClients } from './hooks/useClients';
import { useProjects } from './hooks/useProjects';
import { useProjectSubcollections } from './hooks/useProjectSubcollections';
import { useCompanyExpenses } from './hooks/useCompanyExpenses';
import { projectColorOf } from './lib/projectColor';
import { Sidebar } from './components/Sidebar';
import { ProjectsView } from './components/ProjectsView';
import { ClientsView } from './components/ClientsView';
import { ProjectCalendarView } from './components/ProjectCalendarView';
import { CalendarWidget } from './components/CalendarWidget';
import { BudgetView } from './components/BudgetView';
import { BillingView } from './components/BillingView';
import { ExpensesView } from './components/ExpensesView';
import { CompanyExpensesView } from './components/CompanyExpensesView';
import { DashboardView } from './components/DashboardView';
import { StructureManagerView } from './components/StructureManagerView';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';
import { EditBudgetItemModal } from './components/modals/EditBudgetItemModal';
import { CalendarEventModal } from './components/modals/CalendarEventModal';
import { EditExpenseItemModal } from './components/modals/EditExpenseItemModal';
import { EditInvoiceItemModal } from './components/modals/EditInvoiceItemModal';
import { ScannedExpensePreviewModal } from './components/modals/ScannedExpensePreviewModal';
import { InvoicePreviewModal } from './components/modals/InvoicePreviewModal';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { db, isAdmin, OperationType, handleFirestoreError } from './lib/firebase';
import type { CompanyInfo, CalendarEvent, CalendarEventType, BudgetItem, ExpenseItem } from './types';
import { DEFAULT_COMPANY, PROJECT_COLORS } from './data/constants';

/**
 * ReformasPro: A comprehensive management tool for renovation projects.
 */


const App = () => {
  // --- AUTH STATE ---
  const { user, authReady, handleLogin, handleLogout } = useAuth();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { companyInfo } = useSettings(user);

  const { clients, handleAddClient, handleUpdateClient } = useClients(user);
  const { projects, handleAddProject: handleAddProjectFor, handleUpdateProjectStatus } = useProjects(user, selectedProjectId, setSelectedProjectId, clients, handleAddClient);
  const { events, saveEvent } = useCalendarEvents(user);
  const {
    budgets,
    invoices,
    expenses,
    handleAddBudgetItemFromCatalog,
    handleAddAdHocBudgetItem,
    handleUpdateBudgetItem: handleUpdateBudgetItemFor,
    handleGenerateInvoice: handleGenerateInvoiceFor,
    handleUpdateInvoiceItem: handleUpdateInvoiceItemFor,
    handleSaveExpense,
    handleUpdateExpenseItem: handleUpdateExpenseItemFor,
    isScanningExpense,
    expenseScanError,
    setExpenseScanError,
    scannedExpensePreview,
    setScannedExpensePreview,
    isConfirmingExpense,
    handleExpenseScan,
    handleConfirmScannedExpense,
  } = useProjectSubcollections(user, selectedProjectId, projects);
  const {
    expenses: companyExpenses,
    handleSaveExpense: handleSaveCompanyExpense,
    handleUpdateExpenseItem: handleUpdateCompanyExpenseItemFor,
    isScanningExpense: isScanningCompanyExpense,
    expenseScanError: companyExpenseScanError,
    setExpenseScanError: setCompanyExpenseScanError,
    scannedExpensePreview: scannedCompanyExpensePreview,
    setScannedExpensePreview: setScannedCompanyExpensePreview,
    isConfirmingExpense: isConfirmingCompanyExpense,
    handleExpenseScan: handleCompanyExpenseScan,
    handleConfirmScannedExpense: handleConfirmScannedCompanyExpense,
  } = useCompanyExpenses(user);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [addingEventDate, setAddingEventDate] = useState<string | null>(null);
  const [addingEventProjectId, setAddingEventProjectId] = useState<string | null>(null);
  const [editingBudgetItem, setEditingBudgetItem] = useState<BudgetItem | null>(null);
  const [isInvoiceVisible, setIsInvoiceVisible] = useState(false);
  const [editingInvoiceItem, setEditingInvoiceItem] = useState<BudgetItem | null>(null);
  const [editingExpenseItem, setEditingExpenseItem] = useState<ExpenseItem | null>(null);
  const [editingCompanyExpenseItem, setEditingCompanyExpenseItem] = useState<ExpenseItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: any; type: string; label: string } | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyDraft, setCompanyDraft] = useState<CompanyInfo>(DEFAULT_COMPANY);

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

  const handleUpdateCompanyExpenseItem = async (e: React.FormEvent<HTMLFormElement>) => {
    await handleUpdateCompanyExpenseItemFor(editingCompanyExpenseItem, e);
    setEditingCompanyExpenseItem(null);
  };

  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as CalendarEventType;
    const eventData = {
      id: editingEvent?.id || Date.now(),
      projectId: formData.get('projectId') as string,
      type,
      startDate: formData.get('startDate') as string,
      ...(type === 'planning'
        ? { endDate: formData.get('endDate') as string }
        : { startTime: formData.get('startTime') as string, endTime: formData.get('endTime') as string }),
      worker: formData.get('worker') as string,
      task: formData.get('task') as string,
      status: formData.get('status') as 'pendiente' | 'urgente'
    };

    await saveEvent(eventData, editingEvent?.firebaseId);
    setEditingEvent(null);
    setAddingEventDate(null);
    setAddingEventProjectId(null);
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
      } else if (type === 'company-expense') {
        await deleteDoc(doc(db, 'company_expenses', String(id)));
      } else if (type === 'event') {
        await deleteDoc(doc(db, 'calendar_events', String(id)));
      } else if (type === 'client') {
        await deleteDoc(doc(db, 'clients', String(id)));
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

  const handleResetDatabase = async () => {
    if (!isAdmin()) {
      alert("Solo el administrador puede realizar esta acción.");
      return;
    }

    if (!confirm("¿ESTÁS SEGURO? Se eliminarán TODOS los proyectos, partidas, gastos y eventos por completo. Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      // 1. Clear Projects (and subcollections)
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

      // 2. Clear Events
      for (const event of events) {
        if (event.firebaseId) await deleteDoc(doc(db, 'calendar_events', event.firebaseId));
      }

      alert("Base de datos reiniciada con éxito.");
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'all');
    }
  };

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    const success = await handleAddProjectFor(e);
    if (success) setIsModalOpen(false);
  };

  const selectedProject = projects.find(p => p.firebaseId === selectedProjectId) || projects[0] || null;

  const activeColor = selectedProject ? projectColorOf(selectedProject) : PROJECT_COLORS[0];

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
      <ConfirmDeleteModal
        deleteConfirmation={deleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
        confirmDelete={confirmDelete}
      />

      <EditBudgetItemModal
        editingBudgetItem={editingBudgetItem}
        setEditingBudgetItem={setEditingBudgetItem}
        handleUpdateBudgetItem={handleUpdateBudgetItem}
      />

      <CalendarEventModal
        addingEventDate={addingEventDate}
        addingEventProjectId={addingEventProjectId}
        editingEvent={editingEvent}
        projects={projects}
        setAddingEventDate={setAddingEventDate}
        setEditingEvent={setEditingEvent}
        setDeleteConfirmation={setDeleteConfirmation}
        handleSaveEvent={handleSaveEvent}
      />

      <EditExpenseItemModal
        editingExpenseItem={editingExpenseItem}
        setEditingExpenseItem={setEditingExpenseItem}
        handleUpdateExpenseItem={handleUpdateExpenseItem}
      />

      <EditExpenseItemModal
        editingExpenseItem={editingCompanyExpenseItem}
        setEditingExpenseItem={setEditingCompanyExpenseItem}
        handleUpdateExpenseItem={handleUpdateCompanyExpenseItem}
      />

      <EditInvoiceItemModal
        editingInvoiceItem={editingInvoiceItem}
        setEditingInvoiceItem={setEditingInvoiceItem}
        handleUpdateInvoiceItem={handleUpdateInvoiceItem}
      />

      <ScannedExpensePreviewModal
        scannedExpensePreview={scannedExpensePreview}
        setScannedExpensePreview={setScannedExpensePreview}
        isConfirmingExpense={isConfirmingExpense}
        handleConfirmScannedExpense={handleConfirmScannedExpense}
      />

      <ScannedExpensePreviewModal
        scannedExpensePreview={scannedCompanyExpensePreview}
        setScannedExpensePreview={setScannedCompanyExpensePreview}
        isConfirmingExpense={isConfirmingCompanyExpense}
        handleConfirmScannedExpense={handleConfirmScannedCompanyExpense}
      />

      <InvoicePreviewModal
        isInvoiceVisible={isInvoiceVisible}
        setIsInvoiceVisible={setIsInvoiceVisible}
        activeTab={activeTab}
        invoices={invoices}
        budgets={budgets}
        selectedProjectId={selectedProjectId}
        selectedProject={selectedProject}
        companyInfo={companyInfo}
      />

      <Sidebar
        user={user}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeColor={activeColor}
        handleLogout={handleLogout}
        handleResetDatabase={handleResetDatabase}
      />
      
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
              {activeTab === 'budgets' && "Presupuesto Obra"}
              {activeTab === 'global-calendar' && "Agenda de Empresa"}
              {activeTab === 'dashboard' && "Panel General"}
              {activeTab === 'billing' && "Módulo Facturación"}
              {activeTab === 'expenses' && "Tickets y Gastos"}
              {activeTab === 'company-expenses' && "Gasto Erkiale"}
              {activeTab === 'structure' && "Catálogo"}
              {activeTab === 'projects' && "Listado Proyectos"}
              {activeTab === 'clients' && "Clientes"}
              {activeTab === 'project-calendar' && "Calendario Proyecto"}
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
              
              {activeTab === 'budgets' && (
                <BudgetView
                  project={selectedProject}
                  selectedProjectId={selectedProjectId}
                  budgets={budgets}
                  expenses={expenses}
                  user={user}
                  handleAddBudgetItemFromCatalog={handleAddBudgetItemFromCatalog}
                  handleAddAdHocBudgetItem={handleAddAdHocBudgetItem}
                  setEditingBudgetItem={setEditingBudgetItem}
                  setDeleteConfirmation={setDeleteConfirmation}
                  setIsInvoiceVisible={setIsInvoiceVisible}
                  handleGenerateInvoice={handleGenerateInvoice}
                  isGeneratingInvoice={isGeneratingInvoice}
                />
              )}

              {activeTab === 'project-calendar' && (
                <ProjectCalendarView
                  project={selectedProject}
                  selectedProjectId={selectedProjectId}
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  events={events}
                  projects={projects}
                  activeColor={activeColor}
                  setAddingEventDate={setAddingEventDate}
                  setAddingEventProjectId={setAddingEventProjectId}
                  setEditingEvent={setEditingEvent}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'clients' && (
                <ClientsView
                  clients={clients}
                  handleAddClient={handleAddClient}
                  handleUpdateClient={handleUpdateClient}
                  setDeleteConfirmation={setDeleteConfirmation}
                />
              )}

              {activeTab === 'global-calendar' && (
                <CalendarWidget
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  events={events}
                  projects={projects}
                  activeColor={activeColor}
                  setAddingEventDate={setAddingEventDate}
                  setAddingEventProjectId={setAddingEventProjectId}
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
                  companyInfo={companyInfo}
                  isEditingCompany={isEditingCompany}
                  setIsEditingCompany={setIsEditingCompany}
                  companyDraft={companyDraft}
                  setCompanyDraft={setCompanyDraft}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpensesView
                  project={selectedProject}
                  selectedProjectId={selectedProjectId}
                  expenses={expenses}
                  setEditingExpenseItem={setEditingExpenseItem}
                  setDeleteConfirmation={setDeleteConfirmation}
                  handleSaveExpense={handleSaveExpense}
                  isScanningExpense={isScanningExpense}
                  expenseScanError={expenseScanError}
                  handleExpenseScan={handleExpenseScan}
                />
              )}

              {activeTab === 'company-expenses' && (
                <CompanyExpensesView
                  expenses={companyExpenses}
                  setEditingExpenseItem={setEditingCompanyExpenseItem}
                  setDeleteConfirmation={setDeleteConfirmation}
                  handleSaveExpense={handleSaveCompanyExpense}
                  isScanningExpense={isScanningCompanyExpense}
                  expenseScanError={companyExpenseScanError}
                  handleExpenseScan={handleCompanyExpenseScan}
                />
              )}

              {activeTab === 'dashboard' && (
                <DashboardView
                  projects={projects}
                  budgets={budgets}
                  events={events}
                  setSelectedProjectId={setSelectedProjectId}
                  setActiveTab={setActiveTab}
                />
              )}

              {activeTab === 'structure' && <StructureManagerView user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <NewProjectModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        clients={clients}
        handleAddProject={handleAddProject}
      />

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
