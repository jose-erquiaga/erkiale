import React from 'react';
import { FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Project, CompanyInfo, BudgetItem } from '../../types';
import { groupItemsByGuildAndRoom } from '../../lib/groupBudgetItems';

interface InvoicePreviewModalProps {
  isInvoiceVisible: boolean;
  setIsInvoiceVisible: (value: boolean) => void;
  activeTab: string;
  invoices: Record<number | string, BudgetItem[]>;
  budgets: Record<number | string, BudgetItem[]>;
  selectedProjectId: string;
  selectedProject: Project | null;
  companyInfo: CompanyInfo;
}

export const InvoicePreviewModal = ({
  isInvoiceVisible,
  setIsInvoiceVisible,
  activeTab,
  invoices,
  budgets,
  selectedProjectId,
  selectedProject,
  companyInfo,
}: InvoicePreviewModalProps) => (
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
                  {(['tareas', 'material'] as const).map(group => {
                    const groupItems = docItems.filter(item => (group === 'material' ? item.tipo === 'material' : item.tipo !== 'material'));
                    if (groupItems.length === 0) return null;
                    const guildGroups = groupItemsByGuildAndRoom(groupItems);
                    return (
                      <React.Fragment key={group}>
                        <tr>
                          <td colSpan={5} className="pt-4 pb-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {group === 'material' ? 'Material' : 'Tareas a realizar'}
                          </td>
                        </tr>
                        {guildGroups.map(g => (
                          <React.Fragment key={g.guildName}>
                            <tr>
                              <td colSpan={5} className="pt-2 pb-1 pl-2 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                                <div className="flex justify-between">
                                  <span>{g.guildName}</span>
                                  <span className="text-slate-500">{g.total.toFixed(2)} €</span>
                                </div>
                              </td>
                            </tr>
                            {g.rooms.map(r => (
                              <React.Fragment key={r.roomName}>
                                <tr>
                                  <td colSpan={5} className="pb-1 pl-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">{r.roomName}</td>
                                </tr>
                                {r.subcategories.map(s => (
                                  <React.Fragment key={s.subcategoryName}>
                                    <tr>
                                      <td colSpan={5} className="pb-1 pl-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{s.subcategoryName}</td>
                                    </tr>
                                    {s.items.map(item => (
                                      <tr key={item.id} className="border-b border-slate-100">
                                        <td className="py-4 pr-4 pl-6">
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
                                  </React.Fragment>
                                ))}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}
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
);
