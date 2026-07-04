import React from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ScannedExpensePreviewState, ScannedExpenseComponentDraft } from '../../hooks/useProjectSubcollections';

interface ScannedExpensePreviewModalProps {
  scannedExpensePreview: ScannedExpensePreviewState | null;
  setScannedExpensePreview: React.Dispatch<React.SetStateAction<ScannedExpensePreviewState | null>>;
  isConfirmingExpense: boolean;
  handleConfirmScannedExpense: () => void;
}

const updateComponent = (
  setScannedExpensePreview: ScannedExpensePreviewModalProps['setScannedExpensePreview'],
  idx: number,
  patch: Partial<ScannedExpenseComponentDraft>
) => {
  setScannedExpensePreview(prev => {
    if (!prev) return prev;
    const components = prev.components.map((c, i) => {
      if (i !== idx) return c;
      const next = { ...c, ...patch };
      if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
        next.price = Math.round(next.quantity * next.unitPrice * 100) / 100;
      }
      return next;
    });
    return { ...prev, components };
  });
};

export const ScannedExpensePreviewModal = ({
  scannedExpensePreview,
  setScannedExpensePreview,
  isConfirmingExpense,
  handleConfirmScannedExpense,
}: ScannedExpensePreviewModalProps) => (
  <AnimatePresence>
    {scannedExpensePreview && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
          className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Revisar Factura Escaneada</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{scannedExpensePreview.components.length} componente{scannedExpensePreview.components.length !== 1 ? 's' : ''} detectado{scannedExpensePreview.components.length !== 1 ? 's' : ''} — edita antes de guardar</p>
            </div>
            <button onClick={() => setScannedExpensePreview(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200"><X size={18}/></button>
          </div>

          <div className="p-8 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-100">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Proveedor</label>
              <input value={scannedExpensePreview.provider} onChange={e => setScannedExpensePreview(prev => prev && { ...prev, provider: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha</label>
              <input type="date" value={scannedExpensePreview.date} onChange={e => setScannedExpensePreview(prev => prev && { ...prev, date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo (toda la factura)</label>
              <select value={scannedExpensePreview.tipo} onChange={e => setScannedExpensePreview(prev => prev && { ...prev, tipo: e.target.value as 'material' | 'trabajo' })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
                <option value="material">Material</option>
                <option value="trabajo">Trabajo a realizar</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Forma de pago</label>
              <select value={scannedExpensePreview.paymentMethod} onChange={e => setScannedExpensePreview(prev => prev && { ...prev, paymentMethod: e.target.value as ScannedExpensePreviewState['paymentMethod'] })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 appearance-none">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="a_cuenta">A cuenta</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
                  <th className="p-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Cantidad</th>
                  <th className="p-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">P. Unitario</th>
                  <th className="p-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-28">Total</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {scannedExpensePreview.components.map((component, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3">
                      <input value={component.concept} onChange={e => updateComponent(setScannedExpensePreview, idx, { concept: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100"/>
                    </td>
                    <td className="p-3">
                      <input type="number" step="0.01" min="0" value={component.quantity}
                        onChange={e => updateComponent(setScannedExpensePreview, idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 text-right"/>
                    </td>
                    <td className="p-3">
                      <input type="number" step="0.01" min="0" value={component.unitPrice}
                        onChange={e => updateComponent(setScannedExpensePreview, idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-28 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 text-right"/>
                    </td>
                    <td className="p-3">
                      <input type="number" step="0.01" min="0" value={component.price}
                        onChange={e => updateComponent(setScannedExpensePreview, idx, { price: parseFloat(e.target.value) || 0 })}
                        className="w-28 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 text-right"/>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => setScannedExpensePreview(prev => prev && { ...prev, components: prev.components.filter((_, i) => i !== idx) })}
                        className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"><X size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <button
              onClick={() => setScannedExpensePreview(prev => prev && { ...prev, components: [...prev.components, { concept: '', quantity: 1, unitPrice: 0, price: 0 }] })}
              className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
            >
              <Plus size={14}/> Añadir línea manual
            </button>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Suma total (informativo)</p>
              <p className="text-sm font-black text-slate-900">{scannedExpensePreview.components.reduce((acc, c) => acc + c.price, 0).toFixed(2)} €</p>
            </div>
          </div>

          <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/30">
            <button onClick={() => setScannedExpensePreview(null)}
              className="px-6 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
              Cancelar
            </button>
            <button onClick={handleConfirmScannedExpense} disabled={scannedExpensePreview.components.length === 0 || isConfirmingExpense}
              className="px-8 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-slate-300 disabled:cursor-not-allowed">
              {isConfirmingExpense ? 'Guardando...' : `Guardar ${scannedExpensePreview.components.length} gasto${scannedExpensePreview.components.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
