import React from 'react';
import { Camera, LayoutDashboard, Plus, CheckCircle2, X, AlertCircle, Hammer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import type { CatalogItem, CompanyInfo } from '../types';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';

interface CatalogViewProps {
  catalog: CatalogItem[];
  categories: string[];
  units: string[];
  companyInfo: CompanyInfo;
  isScanningCatalog: boolean;
  catalogScanError: string | null;
  setCatalogScanError: (value: string | null) => void;
  handleCatalogScan: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isManagingLists: boolean;
  setIsManagingLists: (value: boolean) => void;
  isAddingCategory: boolean;
  setIsAddingCategory: (value: boolean) => void;
  tempCategory: string;
  setTempCategory: (value: string) => void;
  saveNewCategory: () => void;
  isAddingUnit: boolean;
  setIsAddingUnit: (value: boolean) => void;
  tempUnit: string;
  setTempUnit: (value: string) => void;
  saveNewUnit: () => void;
  editingCatName: { old: string; val: string } | null;
  setEditingCatName: (value: { old: string; val: string } | null) => void;
  editingUnitName: { old: string; val: string } | null;
  setEditingUnitName: (value: { old: string; val: string } | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
  isEditingCompany: boolean;
  setIsEditingCompany: (value: boolean) => void;
  companyDraft: CompanyInfo;
  setCompanyDraft: React.Dispatch<React.SetStateAction<CompanyInfo>>;
  handleAddCatalogItem: (e: React.FormEvent<HTMLFormElement>) => void;
  setEditingCatalogItem: (item: CatalogItem | null) => void;
}

export const CatalogView = ({
  catalog,
  categories,
  units,
  companyInfo,
  isScanningCatalog,
  catalogScanError,
  setCatalogScanError,
  handleCatalogScan,
  isManagingLists,
  setIsManagingLists,
  isAddingCategory,
  setIsAddingCategory,
  tempCategory,
  setTempCategory,
  saveNewCategory,
  isAddingUnit,
  setIsAddingUnit,
  tempUnit,
  setTempUnit,
  saveNewUnit,
  editingCatName,
  setEditingCatName,
  editingUnitName,
  setEditingUnitName,
  setDeleteConfirmation,
  isEditingCompany,
  setIsEditingCompany,
  companyDraft,
  setCompanyDraft,
  handleAddCatalogItem,
  setEditingCatalogItem,
}: CatalogViewProps) => (
  <div className="space-y-8 max-w-6xl mx-auto">
     <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-100/50">
       <div className="flex justify-between items-center mb-8">
         <div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registro Maestro de Precios</h2>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Añadir nueva referencia al catálogo</p>
         </div>
         <div className="flex gap-2">
            <label className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border border-blue-100 cursor-pointer ${isScanningCatalog ? 'bg-blue-200' : 'bg-blue-50 text-blue-600'}`}>
              {isScanningCatalog ? "Escaneando..." : <><Camera size={12}/> Scanner IA</>}
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleCatalogScan}
                disabled={isScanningCatalog}
              />
            </label>
            <button
              onClick={() => setIsManagingLists(!isManagingLists)}
              className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${isManagingLists ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
            >
              <LayoutDashboard size={12}/> {isManagingLists ? 'Cerrar Gestión' : 'Gestionar Listas'}
            </button>
            {!isManagingLists && (
              <>
                {isAddingCategory ? (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} className="flex gap-1">
                    <input
                      autoFocus
                      value={tempCategory}
                      onChange={(e) => setTempCategory(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveNewCategory()}
                      placeholder="Nueva Cat..."
                      className="text-[10px] p-2 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold"
                    />
                    <button onClick={saveNewCategory} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                      <CheckCircle2 size={12}/>
                    </button>
                    <button onClick={() => setIsAddingCategory(false)} className="p-2 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-colors">
                      <X size={12}/>
                    </button>
                  </motion.div>
                ) : (
                  <button onClick={() => setIsAddingCategory(true)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
                    <Plus size={12}/> Cat.
                  </button>
                )}

                {isAddingUnit ? (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} className="flex gap-1">
                    <input
                      autoFocus
                      value={tempUnit}
                      onChange={(e) => setTempUnit(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveNewUnit()}
                      placeholder="Nueva Ud..."
                      className="text-[10px] p-2 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold"
                    />
                    <button onClick={saveNewUnit} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                      <CheckCircle2 size={12}/>
                    </button>
                    <button onClick={() => setIsAddingUnit(false)} className="p-2 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-colors">
                      <X size={12}/>
                    </button>
                  </motion.div>
                ) : (
                  <button onClick={() => setIsAddingUnit(true)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
                    <Plus size={12}/> Ud.
                  </button>
                )}
              </>
            )}
         </div>
       </div>

       {catalogScanError && (
         <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
           className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4 mb-6 text-rose-700 text-[11px] font-bold">
           <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
           <span>{catalogScanError}</span>
           <button onClick={() => setCatalogScanError(null)} className="ml-auto text-rose-400 hover:text-rose-600"><X size={14}/></button>
         </motion.div>
       )}

       <AnimatePresence>
         {isManagingLists && (
           <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8 border-t border-slate-100 pt-8"
           >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Gestionar Categorías</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        {editingCatName?.old === cat ? (
                          <>
                            <input autoFocus value={editingCatName.val}
                              onChange={e => setEditingCatName({old: cat, val: e.target.value})}
                              onKeyDown={async e => {
                                if (e.key === 'Enter') {
                                  const v = editingCatName.val.trim();
                                  if (v && v !== cat && !categories.includes(v)) {
                                    const newCats = categories.map(c => c === cat ? v : c);
                                    try {
                                      await Promise.all([
                                        setDoc(doc(db, 'settings', 'global'), { categories: newCats, units }, { merge: true }),
                                        ...catalog.filter(i => i.category === cat && i.firebaseId).map(i =>
                                          updateDoc(doc(db, 'catalog', i.firebaseId!), { category: v }))
                                      ]);
                                    } catch (err) {
                                      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                                    }
                                  }
                                  setEditingCatName(null);
                                }
                                if (e.key === 'Escape') setEditingCatName(null);
                              }}
                              className="text-[11px] font-bold bg-white border border-blue-300 rounded-lg px-2 py-0.5 outline-none w-24"/>
                            <button onClick={async () => {
                              const v = editingCatName.val.trim();
                              if (v && v !== cat && !categories.includes(v)) {
                                const newCats = categories.map(c => c === cat ? v : c);
                                try {
                                  await Promise.all([
                                    setDoc(doc(db, 'settings', 'global'), { categories: newCats, units }, { merge: true }),
                                    ...catalog.filter(i => i.category === cat && i.firebaseId).map(i =>
                                      updateDoc(doc(db, 'catalog', i.firebaseId!), { category: v }))
                                  ]);
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                                }
                              }
                              setEditingCatName(null);
                            }} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={10}/></button>
                            <button onClick={() => setEditingCatName(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg"><X size={10}/></button>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] font-bold text-slate-700">{cat}</span>
                            <button onClick={() => setEditingCatName({old: cat, val: cat})} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg ml-1"><Hammer size={10}/></button>
                            <button onClick={() => setDeleteConfirmation({ id: cat, type: 'category', label: cat })} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={10}/></button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Gestionar Unidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {units.map(u => (
                      <div key={u} className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        {editingUnitName?.old === u ? (
                          <>
                            <input autoFocus value={editingUnitName.val}
                              onChange={e => setEditingUnitName({old: u, val: e.target.value})}
                              onKeyDown={async e => {
                                if (e.key === 'Enter') {
                                  const v = editingUnitName.val.trim();
                                  if (v && v !== u && !units.includes(v)) {
                                    const newUnits = units.map(un => un === u ? v : un);
                                    try {
                                      await Promise.all([
                                        setDoc(doc(db, 'settings', 'global'), { categories, units: newUnits }, { merge: true }),
                                        ...catalog.filter(i => i.unit === u && i.firebaseId).map(i =>
                                          updateDoc(doc(db, 'catalog', i.firebaseId!), { unit: v }))
                                      ]);
                                    } catch (err) {
                                      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                                    }
                                  }
                                  setEditingUnitName(null);
                                }
                                if (e.key === 'Escape') setEditingUnitName(null);
                              }}
                              className="text-[11px] font-bold bg-white border border-blue-300 rounded-lg px-2 py-0.5 outline-none w-24"/>
                            <button onClick={async () => {
                              const v = editingUnitName.val.trim();
                              if (v && v !== u && !units.includes(v)) {
                                const newUnits = units.map(un => un === u ? v : un);
                                try {
                                  await Promise.all([
                                    setDoc(doc(db, 'settings', 'global'), { categories, units: newUnits }, { merge: true }),
                                    ...catalog.filter(i => i.unit === u && i.firebaseId).map(i =>
                                      updateDoc(doc(db, 'catalog', i.firebaseId!), { unit: v }))
                                  ]);
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                                }
                              }
                              setEditingUnitName(null);
                            }} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={10}/></button>
                            <button onClick={() => setEditingUnitName(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg"><X size={10}/></button>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] font-bold text-slate-700">{u}</span>
                            <button onClick={() => setEditingUnitName({old: u, val: u})} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg ml-1"><Hammer size={10}/></button>
                            <button onClick={() => setDeleteConfirmation({ id: u, type: 'unit', label: u })} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={10}/></button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* ── Datos de Empresa ── */}
       <div className="border-t border-slate-100 pt-8 mb-8">
         <div className="flex items-center justify-between mb-5">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datos de Empresa (Facturas)</h4>
           <button
             type="button"
             onClick={() => { setCompanyDraft(companyInfo); setIsEditingCompany(!isEditingCompany); }}
             className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${isEditingCompany ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
           >
             <Hammer size={11}/> {isEditingCompany ? 'Cancelar' : 'Editar'}
           </button>
         </div>
         <AnimatePresence>
           {isEditingCompany ? (
             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 try {
                   await setDoc(doc(db, 'settings', 'global'), { companyInfo: companyDraft }, { merge: true });
                   setIsEditingCompany(false);
                 } catch (err) {
                   handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                 }
               }} className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                 {([
                   { field: 'name', label: 'Nombre / Razón social' },
                   { field: 'cif', label: 'CIF / NIF' },
                   { field: 'address', label: 'Dirección' },
                   { field: 'city', label: 'Población y CP' },
                   { field: 'phone', label: 'Teléfono' },
                   { field: 'email', label: 'Email' },
                 ] as { field: keyof CompanyInfo; label: string }[]).map(({ field, label }) => (
                   <div key={field} className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
                     <input
                       value={companyDraft[field]}
                       onChange={e => setCompanyDraft(prev => ({ ...prev, [field]: e.target.value }))}
                       className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                     />
                   </div>
                 ))}
                 <div className="md:col-span-2 flex gap-3 pt-2">
                   <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                     Guardar Datos
                   </button>
                   <button type="button" onClick={() => setIsEditingCompany(false)} className="px-6 py-2.5 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                     Cancelar
                   </button>
                 </div>
               </form>
             </motion.div>
           ) : (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] leading-relaxed text-slate-600 space-y-0.5">
               <p className="font-black text-slate-800">{companyInfo.name}</p>
               {companyInfo.cif && <p>{companyInfo.cif}</p>}
               {companyInfo.address && <p>{companyInfo.address}</p>}
               {companyInfo.city && <p>{companyInfo.city}</p>}
               {companyInfo.phone && <p>Telf. {companyInfo.phone}</p>}
               {companyInfo.email && <p>{companyInfo.email}</p>}
             </motion.div>
           )}
         </AnimatePresence>
       </div>

       <form onSubmit={handleAddCatalogItem} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
         <div className="md:col-span-3 space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría</label>
           <select name="category" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm appearance-none">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
           </select>
         </div>
         <div className="md:col-span-4 space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Concepto / Partida</label>
           <input name="concept" required type="text" placeholder="Ej: Alicatado baño..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm" />
         </div>
         <div className="md:col-span-2 space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unidad</label>
           <select name="unit" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm appearance-none">
              {units.map(u => <option key={u} value={u}>{u}</option>)}
           </select>
         </div>
         <div className="md:col-span-2 space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">P. Unitario (€)</label>
           <input name="price" required type="number" step="0.01" min="0" placeholder="0.00" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm" />
         </div>
         <div className="md:col-span-1">
           <button type="submit" className="bg-blue-600 text-white p-4 h-[60px] w-full rounded-2xl font-black flex items-center justify-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
             <Plus size={24} />
           </button>
         </div>
       </form>
     </div>

     <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
       <table className="w-full text-left">
         <thead className="bg-slate-900 border-b border-slate-800">
           <tr>
             <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
             <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
             <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ud.</th>
             <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio / Ud.</th>
           </tr>
         </thead>
         <tbody>
           {catalog.map((item, idx) => (
             <motion.tr
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="border-b border-slate-50 hover:bg-blue-50/20 transition-all group"
             >
               <td className="p-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">{item.concept}</span>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Ref: {item.id}</span>
                  </div>
               </td>
               <td className="p-6"><span className="text-[9px] font-black bg-blue-50 text-blue-500 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-widest">{item.category}</span></td>
               <td className="p-6 text-xs font-bold text-slate-400 text-right">{item.unit}</td>
               <td className="p-6 text-sm font-black text-slate-900 text-right">{item.price.toFixed(2)}€</td>
               <td className="p-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCatalogItem(item); }}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors bg-blue-50/30"
                      title="Editar Concepto"
                    >
                      <Hammer size={14}/>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ id: item.firebaseId, type: 'catalog', label: item.concept }); }}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors bg-rose-50/30"
                      title="Eliminar Concepto"
                    >
                      <X size={14}/>
                    </button>
                  </div>
               </td>
             </motion.tr>
           ))}
         </tbody>
       </table>
     </div>
  </div>
);
