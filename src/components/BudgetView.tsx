import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X, DollarSign, Receipt, AlertCircle, FileText, Hammer, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Project, BudgetItem, ExpenseItem } from '../types';
import type { CatalogType } from '../types/catalogHierarchy';
import { useCatalogHierarchy } from '../hooks/useCatalogHierarchy';

// Native <select> styled with appearance-none needs an explicit chevron —
// otherwise it's visually indistinguishable from a plain text input.
function SelectChevron() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
      <ChevronDown size={14} />
    </div>
  );
}

interface BudgetViewProps {
  project: Project;
  selectedProjectId: string;
  budgets: Record<number | string, BudgetItem[]>;
  expenses: Record<number | string, ExpenseItem[]>;
  user: unknown;
  handleAddBudgetItemFromCatalog: (item: ReturnType<typeof useCatalogHierarchy>['items'][number], qty: number) => Promise<boolean | undefined>;
  handleAddAdHocBudgetItem: (data: { concept: string; qty: number; unit: string; price: number; tipo: CatalogType }) => Promise<boolean | undefined>;
  setEditingBudgetItem: (item: BudgetItem | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
  setIsInvoiceVisible: (value: boolean) => void;
  handleGenerateInvoice: () => void;
  isGeneratingInvoice: boolean;
}

const TYPE_LABELS: Record<CatalogType, string> = {
  tareas: 'Tareas a realizar',
  material: 'Material',
};

function BudgetItemsList({ title, items, setEditingBudgetItem, setDeleteConfirmation }: {
  title: string;
  items: BudgetItem[];
  setEditingBudgetItem: (item: BudgetItem | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
}) {
  return (
    <div>
      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 pt-6 pb-2">{title}</h5>
      <table className="w-full text-left border-collapse">
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-10 text-center">
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <FileText size={32} className="opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sin partidas</p>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
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
    </div>
  );
}

export const BudgetView = ({
  project,
  selectedProjectId,
  budgets,
  expenses,
  user,
  handleAddBudgetItemFromCatalog,
  handleAddAdHocBudgetItem,
  setEditingBudgetItem,
  setDeleteConfirmation,
  setIsInvoiceVisible,
  handleGenerateInvoice,
  isGeneratingInvoice,
}: BudgetViewProps) => {
  const hierarchy = useCatalogHierarchy(user);

  const [isAddingBudgetItem, setIsAddingBudgetItem] = useState(false);
  const [addSource, setAddSource] = useState<'catalog' | 'adhoc'>('catalog');

  const [guildId, setGuildId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [type, setType] = useState<CatalogType>('tareas');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [saveAdHocToCatalog, setSaveAdHocToCatalog] = useState(false);

  const sortedGuilds = useMemo(() => [...hierarchy.guilds].sort((a, b) => a.order - b.order), [hierarchy.guilds]);
  const roomsForGuild = useMemo(() => hierarchy.rooms.filter(r => r.guildId === guildId).sort((a, b) => a.order - b.order), [hierarchy.rooms, guildId]);
  const subcatsForType = useMemo(
    () => hierarchy.subcategories.filter(s => s.guildId === guildId && s.roomId === roomId && s.type === type).sort((a, b) => a.order - b.order),
    [hierarchy.subcategories, guildId, roomId, type]
  );
  const itemsForSubcategory = useMemo(
    () => hierarchy.items.filter(i => i.guildId === guildId && i.roomId === roomId && i.type === type && i.subcategoryId === subcategoryId),
    [hierarchy.items, guildId, roomId, type, subcategoryId]
  );

  useEffect(() => { if (!guildId && sortedGuilds.length > 0) setGuildId(sortedGuilds[0].firebaseId); }, [sortedGuilds, guildId]);
  useEffect(() => {
    if (roomId && !roomsForGuild.some(r => r.firebaseId === roomId)) setRoomId('');
    if (!roomId && roomsForGuild.length > 0) setRoomId(roomsForGuild[0].firebaseId);
  }, [roomsForGuild, roomId]);
  useEffect(() => {
    if (subcategoryId && !subcatsForType.some(s => s.firebaseId === subcategoryId)) setSubcategoryId('');
    if (!subcategoryId && subcatsForType.length > 0) setSubcategoryId(subcatsForType[0].firebaseId);
  }, [subcatsForType, subcategoryId]);
  useEffect(() => {
    if (!itemsForSubcategory.some(i => i.firebaseId === selectedCatalogItemId)) {
      setSelectedCatalogItemId(itemsForSubcategory[0]?.firebaseId || '');
    }
  }, [itemsForSubcategory, selectedCatalogItemId]);

  if (!project) return <div className="p-12 text-center text-slate-400 italic">No hay ningún proyecto seleccionado.</div>;
  const projectBudget = budgets[selectedProjectId] ?? [];
  const projectExpensesForBudget = expenses[selectedProjectId] ?? [];
  const totalPresupuesto = projectBudget.reduce((acc, curr) => acc + curr.total, 0);
  const totalGastos = projectExpensesForBudget.reduce((acc, curr) => acc + curr.total, 0);
  const margen = totalPresupuesto - totalGastos;
  const pctEjecucion = totalPresupuesto > 0 ? Math.min((totalGastos / totalPresupuesto) * 100, 100) : 0;
  const overBudget = totalGastos > totalPresupuesto;

  const tareasItems = projectBudget.filter(i => i.tipo !== 'material');
  const materialItems = projectBudget.filter(i => i.tipo === 'material');

  const handleAddFromCatalog = async () => {
    const item = itemsForSubcategory.find(i => i.firebaseId === selectedCatalogItemId);
    if (!item) return;
    const success = await handleAddBudgetItemFromCatalog(item, addQty);
    if (success) setIsAddingBudgetItem(false);
  };

  const handleAddAdHoc = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const concept = formData.get('concept') as string;
    const unit = formData.get('unit') as string;
    const qty = parseFloat(formData.get('qty') as string) || 1;
    const price = parseFloat(formData.get('price') as string) || 0;
    const tipo = formData.get('tipo') as CatalogType;

    const success = await handleAddAdHocBudgetItem({ concept, qty, unit, price, tipo });
    if (success) {
      if (saveAdHocToCatalog && guildId && roomId && subcategoryId) {
        await hierarchy.addItem(guildId, roomId, tipo, subcategoryId, {
          mode: 'texto_libre',
          description: concept,
          unit,
          qty,
          price,
          total: qty * price,
        });
      }
      form.reset();
      setIsAddingBudgetItem(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Financial summary: 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-600 p-8 rounded-[2rem] shadow-2xl shadow-blue-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10"><DollarSign size={90} /></div>
          <div className="relative z-10">
            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-2">Presupuesto</p>
            <p className="text-3xl font-black text-white tracking-tighter mb-1">{totalPresupuesto.toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider">Base imponible · IVA: {(totalPresupuesto * 0.21).toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mt-1">Total c/IVA: {(totalPresupuesto * 1.21).toLocaleString('es-ES', {minimumFractionDigits:2})} €</p>
          </div>
        </div>

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
              <div className="p-8 space-y-4">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAddSource('catalog')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${addSource === 'catalog' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 bg-white border-slate-200'}`}>Desde catálogo</button>
                  <button type="button" onClick={() => setAddSource('adhoc')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${addSource === 'adhoc' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 bg-white border-slate-200'}`}>Crear nuevo</button>
                </div>

                {addSource === 'catalog' ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                     <div className="md:col-span-2 space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Gremio</label>
                       <div className="relative">
                         <select value={guildId} onChange={e => setGuildId(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm appearance-none cursor-pointer">
                           {sortedGuilds.map(g => <option key={g.firebaseId} value={g.firebaseId}>{g.name}</option>)}
                         </select>
                         <SelectChevron />
                       </div>
                     </div>
                     <div className="md:col-span-2 space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Estancia</label>
                       <div className="relative">
                         <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm appearance-none cursor-pointer">
                           {roomsForGuild.map(r => <option key={r.firebaseId} value={r.firebaseId}>{r.name}</option>)}
                         </select>
                         <SelectChevron />
                       </div>
                     </div>
                     <div className="md:col-span-2 space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo</label>
                       <div className="relative">
                         <select value={type} onChange={e => setType(e.target.value as CatalogType)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm appearance-none cursor-pointer">
                           <option value="tareas">Tareas</option>
                           <option value="material">Material</option>
                         </select>
                         <SelectChevron />
                       </div>
                     </div>
                     <div className="md:col-span-2 space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Subcategoría</label>
                       <div className="relative">
                         <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm appearance-none cursor-pointer">
                           {subcatsForType.map(s => <option key={s.firebaseId} value={s.firebaseId}>{s.name}</option>)}
                         </select>
                         <SelectChevron />
                       </div>
                     </div>
                     <div className="md:col-span-2 space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Ítem</label>
                       <div className="relative">
                         <select value={selectedCatalogItemId} onChange={e => setSelectedCatalogItemId(e.target.value)} disabled={itemsForSubcategory.length === 0} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm appearance-none disabled:bg-slate-50 cursor-pointer">
                            {itemsForSubcategory.length > 0 ? itemsForSubcategory.map(item => (
                                <option key={item.firebaseId} value={item.firebaseId}>{item.mode === 'texto_libre' ? item.description : `${item.totalM2}m²`} ({item.price}€/{item.unit})</option>
                            )) : <option>Sin ítems</option>}
                         </select>
                         <SelectChevron />
                       </div>
                     </div>
                     <div className="md:col-span-1 space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Cant.</label>
                       <input type="number" value={addQty} onChange={e => setAddQty(parseFloat(e.target.value) || 1)} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
                     </div>
                     <div className="md:col-span-1">
                       <button onClick={handleAddFromCatalog} disabled={!selectedCatalogItemId} className="w-full bg-blue-600 text-white p-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-slate-300">
                         Añadir
                       </button>
                     </div>
                  </div>
                ) : (
                  <form onSubmit={handleAddAdHoc} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto</label>
                      <input name="concept" required className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo</label>
                      <div className="relative">
                        <select name="tipo" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm appearance-none cursor-pointer">
                          <option value="tareas">Tareas</option>
                          <option value="material">Material</option>
                        </select>
                        <SelectChevron />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Unidad</label>
                      <input name="unit" required placeholder="ud, m2..." className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
                    </div>
                    <div className="md:col-span-1 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Cant.</label>
                      <input name="qty" type="number" step="0.01" min="0.01" defaultValue={1} required className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Precio (€)</label>
                      <input name="price" type="number" step="0.01" min="0" required className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                        Añadir
                      </button>
                    </div>
                    <div className="md:col-span-12">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <input type="checkbox" checked={saveAdHocToCatalog} onChange={e => setSaveAdHocToCatalog(e.target.checked)} />
                        Guardar también en catálogo ({guildId && roomId && subcategoryId ? 'en la subcategoría seleccionada arriba' : 'selecciona antes Gremio/Estancia/Subcategoría en la pestaña "Desde catálogo"'})
                      </label>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <BudgetItemsList title={TYPE_LABELS.tareas} items={tareasItems} setEditingBudgetItem={setEditingBudgetItem} setDeleteConfirmation={setDeleteConfirmation} />
        <BudgetItemsList title={TYPE_LABELS.material} items={materialItems} setEditingBudgetItem={setEditingBudgetItem} setDeleteConfirmation={setDeleteConfirmation} />

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
