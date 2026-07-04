import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Hammer, ChevronDown, Check } from 'lucide-react';
import { useCatalogHierarchy } from '../hooks/useCatalogHierarchy';
import type { CatalogType, CatalogItemMode } from '../types/catalogHierarchy';

const TYPE_LABELS: Record<CatalogType, string> = {
  tareas: 'Tareas a realizar',
  material: 'Material',
};

// Native <select> styled with appearance-none needs an explicit chevron —
// otherwise it's visually indistinguishable from a plain text input.
function SelectChevron() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
      <ChevronDown size={14} />
    </div>
  );
}

export const CatalogHierarchyView = ({ user }: { user: unknown }) => {
  const hierarchy = useCatalogHierarchy(user);

  const [guildId, setGuildId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [type, setType] = useState<CatalogType>('tareas');
  const [subcategoryId, setSubcategoryId] = useState('');

  const [addingGuild, setAddingGuild] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [addingSubcategory, setAddingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  const [renaming, setRenaming] = useState<{ kind: 'guild' | 'room' | 'subcategory'; val: string } | null>(null);

  const [mode, setMode] = useState<CatalogItemMode>('texto_libre');

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

  // Keep downstream selections valid as the hierarchy changes.
  useEffect(() => {
    if (!guildId && sortedGuilds.length > 0) setGuildId(sortedGuilds[0].firebaseId);
  }, [sortedGuilds, guildId]);
  useEffect(() => {
    if (roomId && !roomsForGuild.some(r => r.firebaseId === roomId)) setRoomId('');
    if (!roomId && roomsForGuild.length > 0) setRoomId(roomsForGuild[0].firebaseId);
  }, [roomsForGuild, roomId]);
  useEffect(() => {
    if (subcategoryId && !subcatsForType.some(s => s.firebaseId === subcategoryId)) setSubcategoryId('');
    if (!subcategoryId && subcatsForType.length > 0) setSubcategoryId(subcatsForType[0].firebaseId);
  }, [subcatsForType, subcategoryId]);

  const currentGuildName = sortedGuilds.find(g => g.firebaseId === guildId)?.name || '';
  const currentRoomName = roomsForGuild.find(r => r.firebaseId === roomId)?.name || '';
  const currentSubcategoryName = subcatsForType.find(s => s.firebaseId === subcategoryId)?.name || '';

  const saveRename = async () => {
    if (!renaming || !renaming.val.trim()) { setRenaming(null); return; }
    const val = renaming.val.trim();
    if (renaming.kind === 'guild' && guildId) await hierarchy.renameGuild(guildId, val);
    if (renaming.kind === 'room' && guildId && roomId) await hierarchy.renameRoom(guildId, roomId, val);
    if (renaming.kind === 'subcategory' && guildId && roomId && subcategoryId) await hierarchy.renameSubcategory(guildId, roomId, type, subcategoryId, val);
    setRenaming(null);
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!guildId || !roomId || !subcategoryId) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const unit = formData.get('unit') as string;
    const qty = parseFloat(formData.get('qty') as string) || 1;
    const price = parseFloat(formData.get('price') as string) || 0;

    const base = {
      mode,
      unit,
      qty,
      price,
      total: qty * price,
    };

    const item = mode === 'texto_libre'
      ? { ...base, description: formData.get('description') as string }
      : (() => {
          const largo = parseFloat(formData.get('largo') as string) || 0;
          const ancho = parseFloat(formData.get('ancho') as string) || 0;
          const alto = parseFloat(formData.get('alto') as string) || 0;
          return { ...base, largo, ancho, alto, totalM2: Math.round(largo * ancho * 100) / 100 };
        })();

    const success = await hierarchy.addItem(guildId, roomId, type, subcategoryId, item);
    if (success) form.reset();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-100/50">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Catálogo (Jerárquico)</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Gremio → Estancia → Tipo → Subcategoría → Ítem</p>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Gremio</label>
            {addingGuild ? (
              <div className="flex gap-1">
                <input autoFocus value={newGuildName} onChange={e => setNewGuildName(e.target.value)}
                  onKeyDown={async e => { if (e.key === 'Enter' && newGuildName.trim()) { await hierarchy.addGuild(newGuildName.trim()); setNewGuildName(''); setAddingGuild(false); } if (e.key === 'Escape') setAddingGuild(false); }}
                  className="flex-1 p-3 bg-slate-50 border border-blue-300 rounded-xl text-sm font-bold outline-none" placeholder="Nombre del nuevo gremio..." />
                <button onClick={async () => { if (newGuildName.trim()) { await hierarchy.addGuild(newGuildName.trim()); setNewGuildName(''); } setAddingGuild(false); }} className="px-2 bg-emerald-500 text-white rounded-xl" title="Guardar"><Check size={14}/></button>
                <button onClick={() => setAddingGuild(false)} className="px-2 bg-slate-100 text-slate-500 rounded-xl" title="Cancelar"><X size={14}/></button>
              </div>
            ) : renaming?.kind === 'guild' ? (
              <div className="flex gap-1">
                <input autoFocus value={renaming.val} onChange={e => setRenaming({ kind: 'guild', val: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(null); }}
                  className="flex-1 p-3 bg-slate-50 border border-blue-300 rounded-xl text-sm font-bold outline-none" />
                <button onClick={saveRename} className="px-2 bg-emerald-500 text-white rounded-xl" title="Guardar"><Check size={14}/></button>
                <button onClick={() => setRenaming(null)} className="px-2 bg-slate-100 text-slate-500 rounded-xl" title="Cancelar"><X size={14}/></button>
              </div>
            ) : (
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <select value={guildId} onChange={e => setGuildId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 appearance-none cursor-pointer">
                    {sortedGuilds.length === 0 ? <option>Sin gremios</option> : sortedGuilds.map(g => <option key={g.firebaseId} value={g.firebaseId}>{g.name}</option>)}
                  </select>
                  <SelectChevron />
                </div>
                <button onClick={() => guildId && setRenaming({ kind: 'guild', val: currentGuildName })} disabled={!guildId} className="px-2 bg-slate-100 text-blue-500 rounded-xl hover:bg-blue-50 disabled:opacity-50" title="Renombrar gremio"><Hammer size={14}/></button>
                <button onClick={() => setAddingGuild(true)} className="px-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200" title="Nuevo gremio"><Plus size={14}/></button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Estancia</label>
            {addingRoom ? (
              <div className="flex gap-1">
                <input autoFocus value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
                  onKeyDown={async e => { if (e.key === 'Enter' && newRoomName.trim() && guildId) { await hierarchy.addRoom(guildId, newRoomName.trim()); setNewRoomName(''); setAddingRoom(false); } if (e.key === 'Escape') setAddingRoom(false); }}
                  className="flex-1 p-3 bg-slate-50 border border-blue-300 rounded-xl text-sm font-bold outline-none" placeholder="Nombre de la nueva estancia..." disabled={!guildId} />
                <button onClick={async () => { if (newRoomName.trim() && guildId) { await hierarchy.addRoom(guildId, newRoomName.trim()); setNewRoomName(''); } setAddingRoom(false); }} className="px-2 bg-emerald-500 text-white rounded-xl" title="Guardar"><Check size={14}/></button>
                <button onClick={() => setAddingRoom(false)} className="px-2 bg-slate-100 text-slate-500 rounded-xl" title="Cancelar"><X size={14}/></button>
              </div>
            ) : renaming?.kind === 'room' ? (
              <div className="flex gap-1">
                <input autoFocus value={renaming.val} onChange={e => setRenaming({ kind: 'room', val: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(null); }}
                  className="flex-1 p-3 bg-slate-50 border border-blue-300 rounded-xl text-sm font-bold outline-none" />
                <button onClick={saveRename} className="px-2 bg-emerald-500 text-white rounded-xl" title="Guardar"><Check size={14}/></button>
                <button onClick={() => setRenaming(null)} className="px-2 bg-slate-100 text-slate-500 rounded-xl" title="Cancelar"><X size={14}/></button>
              </div>
            ) : (
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <select value={roomId} onChange={e => setRoomId(e.target.value)} disabled={!guildId} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 appearance-none disabled:opacity-50 cursor-pointer">
                    {roomsForGuild.length === 0 ? <option>Sin estancias</option> : roomsForGuild.map(r => <option key={r.firebaseId} value={r.firebaseId}>{r.name}</option>)}
                  </select>
                  <SelectChevron />
                </div>
                <button onClick={() => roomId && setRenaming({ kind: 'room', val: currentRoomName })} disabled={!roomId} className="px-2 bg-slate-100 text-blue-500 rounded-xl hover:bg-blue-50 disabled:opacity-50" title="Renombrar estancia"><Hammer size={14}/></button>
                <button onClick={() => setAddingRoom(true)} disabled={!guildId} className="px-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 disabled:opacity-50" title="Nueva estancia"><Plus size={14}/></button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo</label>
            <div className="relative">
              <select value={type} onChange={e => setType(e.target.value as CatalogType)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 appearance-none cursor-pointer">
                <option value="tareas">Tareas a realizar</option>
                <option value="material">Material</option>
              </select>
              <SelectChevron />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Subcategoría</label>
            {addingSubcategory ? (
              <div className="flex gap-1">
                <input autoFocus value={newSubcategoryName} onChange={e => setNewSubcategoryName(e.target.value)}
                  onKeyDown={async e => { if (e.key === 'Enter' && newSubcategoryName.trim() && guildId && roomId) { await hierarchy.addSubcategory(guildId, roomId, type, newSubcategoryName.trim()); setNewSubcategoryName(''); setAddingSubcategory(false); } if (e.key === 'Escape') setAddingSubcategory(false); }}
                  className="flex-1 p-3 bg-slate-50 border border-blue-300 rounded-xl text-sm font-bold outline-none" placeholder="Nombre de la nueva subcategoría..." disabled={!roomId} />
                <button onClick={async () => { if (newSubcategoryName.trim() && guildId && roomId) { await hierarchy.addSubcategory(guildId, roomId, type, newSubcategoryName.trim()); setNewSubcategoryName(''); } setAddingSubcategory(false); }} className="px-2 bg-emerald-500 text-white rounded-xl" title="Guardar"><Check size={14}/></button>
                <button onClick={() => setAddingSubcategory(false)} className="px-2 bg-slate-100 text-slate-500 rounded-xl" title="Cancelar"><X size={14}/></button>
              </div>
            ) : renaming?.kind === 'subcategory' ? (
              <div className="flex gap-1">
                <input autoFocus value={renaming.val} onChange={e => setRenaming({ kind: 'subcategory', val: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(null); }}
                  className="flex-1 p-3 bg-slate-50 border border-blue-300 rounded-xl text-sm font-bold outline-none" />
                <button onClick={saveRename} className="px-2 bg-emerald-500 text-white rounded-xl" title="Guardar"><Check size={14}/></button>
                <button onClick={() => setRenaming(null)} className="px-2 bg-slate-100 text-slate-500 rounded-xl" title="Cancelar"><X size={14}/></button>
              </div>
            ) : (
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)} disabled={!roomId} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 appearance-none disabled:opacity-50 cursor-pointer">
                    {subcatsForType.length === 0 ? <option>Sin subcategorías</option> : subcatsForType.map(s => <option key={s.firebaseId} value={s.firebaseId}>{s.name}</option>)}
                  </select>
                  <SelectChevron />
                </div>
                <button onClick={() => subcategoryId && setRenaming({ kind: 'subcategory', val: currentSubcategoryName })} disabled={!subcategoryId} className="px-2 bg-slate-100 text-blue-500 rounded-xl hover:bg-blue-50 disabled:opacity-50" title="Renombrar subcategoría"><Hammer size={14}/></button>
                <button onClick={() => setAddingSubcategory(true)} disabled={!roomId} className="px-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 disabled:opacity-50" title="Nueva subcategoría"><Plus size={14}/></button>
              </div>
            )}
          </div>
        </div>

        {/* Item creation form */}
        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modo:</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('texto_libre')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${mode === 'texto_libre' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>Texto libre</button>
              <button type="button" onClick={() => setMode('medidas')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${mode === 'medidas' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>Medidas</button>
            </div>
          </div>

          <form onSubmit={handleAddItem} className="space-y-4">
            {mode === 'texto_libre' ? (
              <input name="description" required placeholder="Descripción..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <input name="largo" type="number" step="0.01" min="0" required placeholder="Largo (m)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
                <input name="ancho" type="number" step="0.01" min="0" required placeholder="Ancho (m)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
                <input name="alto" type="number" step="0.01" min="0" placeholder="Alto (m, opcional)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <input name="unit" required placeholder="Unidad (m2, ud...)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
              <input name="qty" type="number" step="0.01" min="0.01" defaultValue={1} required placeholder="Cantidad" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
              <input name="price" type="number" step="0.01" min="0" required placeholder="Precio (€)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm" />
            </div>
            <button type="submit" disabled={!subcategoryId} className="bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:bg-slate-300 flex items-center gap-2">
              <Plus size={16}/> Añadir Ítem
            </button>
          </form>
        </div>
      </div>

      {/* Items list for the current subcategory */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 border-b border-slate-800">
            <tr>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ud.</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cant.</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
              <th className="p-6"></th>
            </tr>
          </thead>
          <tbody>
            {itemsForSubcategory.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-slate-300 italic">Sin ítems en esta subcategoría</td></tr>
            ) : itemsForSubcategory.map(item => (
              <tr key={item.firebaseId} className="border-b border-slate-50 hover:bg-blue-50/20 transition-all">
                <td className="p-6">
                  <span className="text-sm font-bold text-slate-800">
                    {item.mode === 'texto_libre' ? item.description : `Medidas ${item.largo}×${item.ancho}${item.alto ? `×${item.alto}` : ''} (${item.totalM2} m²)`}
                  </span>
                </td>
                <td className="p-6 text-xs font-bold text-slate-400 text-right">{item.unit}</td>
                <td className="p-6 text-sm text-slate-600 text-right">{item.qty}</td>
                <td className="p-6 text-sm font-bold text-slate-700 text-right">{item.price.toFixed(2)}€</td>
                <td className="p-6 text-sm font-black text-slate-900 text-right">{item.total.toFixed(2)}€</td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => hierarchy.deleteItem(item.guildId, item.roomId, item.type, item.subcategoryId, item.firebaseId)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors bg-rose-50/30">
                      <X size={14}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
