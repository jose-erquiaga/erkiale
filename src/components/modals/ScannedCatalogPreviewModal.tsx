import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ScannedItem = { concept: string; category: string; unit: string; price: number };

interface ScannedCatalogPreviewModalProps {
  scannedCatalogPreview: ScannedItem[] | null;
  setScannedCatalogPreview: React.Dispatch<React.SetStateAction<ScannedItem[] | null>>;
  categories: string[];
  units: string[];
  isConfirmingCatalog: boolean;
  handleConfirmScannedCatalog: () => void;
}

export const ScannedCatalogPreviewModal = ({
  scannedCatalogPreview,
  setScannedCatalogPreview,
  categories,
  units,
  isConfirmingCatalog,
  handleConfirmScannedCatalog,
}: ScannedCatalogPreviewModalProps) => (
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
);
