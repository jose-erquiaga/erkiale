import React from 'react';
import { Receipt, Hammer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc } from 'firebase/firestore';
import type { Project, BudgetItem, CompanyInfo } from '../types';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { groupItemsByGuildAndRoom } from '../lib/groupBudgetItems';

interface BillingViewProps {
  project: Project;
  selectedProjectId: string;
  invoices: Record<number | string, BudgetItem[]>;
  setActiveTab: (tab: string) => void;
  setEditingInvoiceItem: (item: BudgetItem | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
  setIsInvoiceVisible: (value: boolean) => void;
  companyInfo: CompanyInfo;
  isEditingCompany: boolean;
  setIsEditingCompany: (value: boolean) => void;
  companyDraft: CompanyInfo;
  setCompanyDraft: React.Dispatch<React.SetStateAction<CompanyInfo>>;
}

function CompanyInfoCard({ companyInfo, isEditingCompany, setIsEditingCompany, companyDraft, setCompanyDraft }: {
  companyInfo: CompanyInfo;
  isEditingCompany: boolean;
  setIsEditingCompany: (value: boolean) => void;
  companyDraft: CompanyInfo;
  setCompanyDraft: React.Dispatch<React.SetStateAction<CompanyInfo>>;
}) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Datos de Empresa (Facturas)</h4>
        <button
          type="button"
          onClick={() => { setCompanyDraft(companyInfo); setIsEditingCompany(!isEditingCompany); }}
          className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${isEditingCompany ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
        >
          <Hammer size={11} /> {isEditingCompany ? 'Cancelar' : 'Editar'}
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
  );
}

function InvoiceItemRows({ items, setEditingInvoiceItem, setDeleteConfirmation }: {
  items: BudgetItem[];
  setEditingInvoiceItem: (item: BudgetItem | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
}) {
  return (
    <table className="w-full text-left border-collapse">
      <tbody>
        {items.map((item, idx) => (
          <motion.tr
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="border-b border-slate-50 hover:bg-emerald-50/10 transition-all cursor-default group"
          >
            <td className="p-6">
              <span className="text-[9px] font-bold text-slate-900">{item.concept}</span>
            </td>
            <td className="p-6 text-sm text-slate-600 font-bold text-center">
              <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{item.qty} {item.unit}</span>
            </td>
            <td className="p-6 text-sm text-slate-500 font-medium text-right">{item.price.toFixed(2)}€</td>
            <td className="p-6 text-sm font-black text-slate-900 text-right">{item.total.toFixed(2)}€</td>
            <td className="p-6 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingInvoiceItem(item)}
                    className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-colors bg-blue-50/50"
                  >
                    <Hammer size={14}/>
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation({ id: item.firebaseId, type: 'invoice', label: item.concept })}
                    className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors bg-rose-50/50"
                  >
                    <X size={14}/>
                  </button>
                </div>
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  );
}

function InvoiceItemsTable({ title, items, setEditingInvoiceItem, setDeleteConfirmation }: {
  title: string;
  items: BudgetItem[];
  setEditingInvoiceItem: (item: BudgetItem | null) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
}) {
  if (items.length === 0) return null;
  const guildGroups = groupItemsByGuildAndRoom(items);
  return (
    <div>
      <h5 className="text-[12px] font-black text-slate-600 uppercase tracking-widest px-6 pt-6 pb-2">{title}</h5>
      {guildGroups.map(g => (
        <div key={g.guildName}>
          <div className="px-6 pt-4 pb-1 flex justify-between items-baseline">
            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">{g.guildName}</p>
            <p className="text-[11px] font-black text-emerald-600">{g.total.toFixed(2)} €</p>
          </div>
          {g.rooms.map(r => (
            <div key={r.roomName}>
              <p className="px-6 pl-10 pt-1 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{r.roomName}</p>
              {r.subcategories.map(s => (
                <div key={s.subcategoryName}>
                  <p className="px-6 pl-14 pb-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{s.subcategoryName}</p>
                  <InvoiceItemRows items={s.items} setEditingInvoiceItem={setEditingInvoiceItem} setDeleteConfirmation={setDeleteConfirmation} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export const BillingView = ({
  project,
  selectedProjectId,
  invoices,
  setActiveTab,
  setEditingInvoiceItem,
  setDeleteConfirmation,
  setIsInvoiceVisible,
  companyInfo,
  isEditingCompany,
  setIsEditingCompany,
  companyDraft,
  setCompanyDraft,
}: BillingViewProps) => {
  if (!project) return <div className="p-12 text-center text-slate-400 italic">No hay ningún proyecto seleccionado.</div>;
  const invoiceItems = invoices[selectedProjectId] ?? [];
  const total = invoiceItems.reduce((acc, curr) => acc + curr.total, 0);
  const tareasItems = invoiceItems.filter(i => i.tipo !== 'material');
  const materialItems = invoiceItems.filter(i => i.tipo === 'material');

  return (
    <div className="space-y-8">
      <CompanyInfoCard
        companyInfo={companyInfo}
        isEditingCompany={isEditingCompany}
        setIsEditingCompany={setIsEditingCompany}
        companyDraft={companyDraft}
        setCompanyDraft={setCompanyDraft}
      />

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Partidas a Facturar</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Importado de Presupuesto Activo</p>
          </div>
          <div className="text-right">
             <p className="text-[11px] font-black text-slate-400 uppercase">Total Base Imponible</p>
             <p className="text-xl font-black text-blue-600">{total.toLocaleString()} €</p>
          </div>
        </div>

        {invoiceItems.length === 0 ? (
          <div className="p-20 text-center">
            <div className="flex flex-col items-center gap-4 text-slate-300">
              <Receipt size={48} className="opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">No hay datos importados para facturar</p>
              <button onClick={() => setActiveTab('budgets')} className="text-blue-500 text-[10px] font-black uppercase underline">Ir a Presupuestos</button>
            </div>
          </div>
        ) : (
          <>
            <InvoiceItemsTable title="Tareas a realizar" items={tareasItems} setEditingInvoiceItem={setEditingInvoiceItem} setDeleteConfirmation={setDeleteConfirmation} />
            <InvoiceItemsTable title="Material" items={materialItems} setEditingInvoiceItem={setEditingInvoiceItem} setDeleteConfirmation={setDeleteConfirmation} />
          </>
        )}

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
           <button
             onClick={() => setIsInvoiceVisible(true)}
             disabled={invoiceItems.length === 0}
             className="px-8 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl disabled:bg-slate-300"
           >
             Vista Previa & PDF
           </button>
        </div>
      </div>
    </div>
  );
};
