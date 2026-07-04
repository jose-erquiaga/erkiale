import React, { useState } from 'react';
import { Plus, X, DollarSign, Receipt, AlertCircle, FileText, Hammer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Project, CatalogItem, BudgetItem, ExpenseItem } from '../types';

interface BudgetViewProps {
  project: Project;
  selectedProjectId: string;
  budgets: Record<number | string, BudgetItem[]>;
  expenses: Record<number | string, ExpenseItem[]>;
  categories: string[];
  catalog: CatalogItem[];
  isAddingBudgetItem: boolean;
  setIsAddingBudgetItem: (value: boolean) => void;
  handleAddBudgetItem: (catalogItemId: string, qty: number) => void;
  setEditingBudgetItem: (item: BudgetItem | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
  setIsInvoiceVisible: (value: boolean) => void;
  handleGenerateInvoice: () => void;
  isGeneratingInvoice: boolean;
}

export const BudgetView = ({
  project,
  selectedProjectId,
  budgets,
  expenses,
  categories,
  catalog,
  isAddingBudgetItem,
  setIsAddingBudgetItem,
  handleAddBudgetItem,
  setEditingBudgetItem,
  setDeleteConfirmation,
  setIsInvoiceVisible,
  handleGenerateInvoice,
  isGeneratingInvoice,
}: BudgetViewProps) => {
  if (!project) return <div className="p-12 text-center text-slate-400 italic">No hay ningún proyecto seleccionado.</div>;
  const projectBudget = budgets[selectedProjectId] ?? [];
  const projectExpensesForBudget = expenses[selectedProjectId] ?? [];
  const totalPresupuesto = projectBudget.reduce((acc, curr) => acc + curr.total, 0);
  const totalGastos = projectExpensesForBudget.reduce((acc, curr) => acc + curr.total, 0);
  const margen = totalPresupuesto - totalGastos;
  const pctEjecucion = totalPresupuesto > 0 ? Math.min((totalGastos / totalPresupuesto) * 100, 100) : 0;
  const overBudget = totalGastos > totalPresupuesto;

  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(1);

  const filteredCatalog = React.useMemo(
    () => catalog.filter(i => i.category === selectedCategory),
    [catalog, selectedCategory]
  );

  React.useEffect(() => {
      setSelectedCatalogId(filteredCatalog.length > 0 ? (filteredCatalog[0].firebaseId || '') : '');
  }, [filteredCatalog]);

  return (
    <div className="space-y-8">
      {/* Financial summary: 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Presupuesto */}
        <div className="bg-blue-600 p-8 rounded-[2rem] shadow-2xl shadow-blue-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10"><DollarSign size={90} /></div>
          <div className="relative z-10">
            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-2">Presupuesto</p>
            <p className="text-3xl font-black text-white tracking-tighter mb-1">{totalPresupuesto.toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider">Base imponible · IVA: {(totalPresupuesto * 0.21).toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mt-1">Total c/IVA: {(totalPresupuesto * 1.21).toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
          </div>
        </div>

        {/* Gastos reales */}
        <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl shadow-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Receipt size={90} /></div>
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Gastos Ejecutados</p>
            <p className={`text-3xl font-black tracking-tighter mb-1 ${overBudget ? 'text-rose-400' : 'text-white'}`}>{totalGastos.toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
            <div className="mt-3">
              <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase mb-1">
                <span>Ejecución del presupuesto</span>
                <span className={overBudget ? 'text-rose-400' : 'text-blue-400'}>{pctEjecucion.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${overBudget ? 'bg-rose-500' : 'bg-blue-500'}`}
                  style={{ width: `${pctEjecucion}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Margen */}
        <div className={`p-8 rounded-[2rem] shadow-2xl relative overflow-hidden ${overBudget ? 'bg-rose-600 shadow-rose-200' : 'bg-emerald-600 shadow-emerald-200'}`}>
          <div className="absolute top-0 right-0 p-6 opacity-10"><AlertCircle size={90} /></div>
          <div className="relative z-10">
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${overBudget ? 'text-rose-100' : 'text-emerald-100'}`}>{overBudget ? 'Desviación (sobre presupuesto)' : 'Margen Disponible'}</p>
            <p className="text-3xl font-black text-white tracking-tighter mb-1">
              {overBudget ? '-' : '+'}{Math.abs(margen).toLocaleString('es-ES', {minimumFractionDigits:2})} €
            </p>
            <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${overBudget ? 'text-rose-200' : 'text-emerald-200'}`}>
              {overBudget
                ? `Excedido en ${(totalGastos - totalPresupuesto).toLocaleString('es-ES', {minimumFractionDigits:2})} €`
                : `Quedan ${(totalPresupuesto > 0 ? (100 - pctEjecucion).toFixed(1) : '0')}% del presupuesto`}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Desglose de Partidas</h4>
          {!isAddingBudgetItem ? (
            <button
              onClick={() => setIsAddingBudgetItem(true)}
              className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors uppercase tracking-widest"
            >
              <Plus size={14} /> Añadir Partida
            </button>
          ) : (
            <button
              onClick={() => setIsAddingBudgetItem(false)}
              className="flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors uppercase tracking-widest"
            >
              <X size={14} /> Cancelar
            </button>
          )}
        </div>

        <AnimatePresence>
          {isAddingBudgetItem && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-blue-50/30 border-b border-blue-100"
            >
              <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                 <div className="md:col-span-3 space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">1. Categoría</label>
                   <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm h-[56px] appearance-none"
                   >
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                   </select>
                 </div>
                 <div className="md:col-span-4 space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">2. Concepto</label>
                   <select
                      value={selectedCatalogId}
                      onChange={(e) => setSelectedCatalogId(e.target.value)}
                      disabled={filteredCatalog.length === 0}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm h-[56px] appearance-none disabled:bg-slate-50 disabled:text-slate-400"
                   >
                      {filteredCatalog.length > 0 ? (
                          filteredCatalog.map(item => (
                              <option key={item.firebaseId} value={item.firebaseId}>{item.concept} ({item.price}€/{item.unit})</option>
                          ))
                      ) : (
                          <option>No hay items en esta categoría</option>
                      )}
                   </select>
                 </div>
                 <div className="md:col-span-2 space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">3. Cantidad</label>
                   <input
                      type="number"
                      value={addQty}
                      onChange={(e) => setAddQty(parseFloat(e.target.value) || 1)}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm h-[56px]"
                   />
                 </div>
                 <div className="md:col-span-3">
                   <button
                      onClick={() => handleAddBudgetItem(selectedCatalogId, addQty)}
                      disabled={!selectedCatalogId}
                      className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 h-[56px] disabled:bg-slate-300 disabled:shadow-none"
                   >
                     Añadir Partida
                   </button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto / Partida</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty.</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio Ud.</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {projectBudget.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-20 text-center">
                  <div className="flex flex-col items-center gap-4 text-slate-300">
                    <FileText size={48} className="opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">No hay partidas registradas</p>
                  </div>
                </td>
              </tr>
            ) : (
              projectBudget.map((item, idx) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-slate-50 hover:bg-blue-50/30 transition-all cursor-default group"
                >
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{item.concept}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Código: #{item.id}</span>
                    </div>
                  </td>
                  <td className="p-6 text-sm text-slate-600 font-bold text-center">
                    <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{item.qty} {item.unit}</span>
                  </td>
                  <td className="p-6 text-sm text-slate-500 font-medium text-right">{item.price.toFixed(2)}€</td>
                  <td className="p-6 text-sm font-black text-slate-900 text-right">{item.total.toFixed(2)}€</td>
                  <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingBudgetItem(item); }}
                          className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-colors bg-blue-50/50"
                          title="Editar Partida"
                        >
                          <Hammer size={14}/>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ id: item.firebaseId, type: 'budget', label: item.concept }); }}
                          className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors bg-rose-50/50"
                          title="Eliminar Partida"
                        >
                          <X size={14}/>
                        </button>
                      </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 print:hidden">
           <button
             onClick={() => setIsInvoiceVisible(true)}
             className="px-8 py-3 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white transition-all shadow-sm"
           >
             Vista Previa Presupuesto
           </button>
           <button
             onClick={handleGenerateInvoice}
             disabled={isGeneratingInvoice}
             className="px-8 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isGeneratingInvoice ? 'Generando...' : 'Pasar a Facturación'}
           </button>
        </div>
      </div>
    </div>
  );
};
