import React, { useState } from 'react';
import { Plus, X, Hammer, ChevronDown, ChevronUp, ArrowUp, ArrowDown, AlertCircle, Lock } from 'lucide-react';
import { isAdmin } from '../lib/firebase';
import { useCatalogHierarchy } from '../hooks/useCatalogHierarchy';
import type { CatalogType } from '../types/catalogHierarchy';

const TYPE_LABELS: Record<CatalogType, string> = {
  tareas: 'Tareas a realizar',
  material: 'Material',
};

interface CascadeConfirmation {
  label: string;
  itemCount: number;
  onConfirm: () => void;
}

export const StructureManagerView = ({ user }: { user: unknown }) => {
  const hierarchy = useCatalogHierarchy(user);
  const [expandedGuilds, setExpandedGuilds] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [newGuildName, setNewGuildName] = useState('');
  const [newRoomName, setNewRoomName] = useState<Record<string, string>>({});
  const [newSubcategoryName, setNewSubcategoryName] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ kind: string; id: string; val: string } | null>(null);
  const [cascadeConfirmation, setCascadeConfirmation] = useState<CascadeConfirmation | null>(null);

  if (!isAdmin()) {
    return (
      <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-4">
        <Lock size={40} className="opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">Solo el administrador puede gestionar la estructura</p>
      </div>
    );
  }

  const toggleGuild = (id: string) => setExpandedGuilds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleRoom = (id: string) => setExpandedRooms(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const sortedGuilds = [...hierarchy.guilds].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {cascadeConfirmation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div onClick={() => setCascadeConfirmation(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
          <div className="bg-white rounded-[2rem] p-10 w-full max-w-md relative z-10 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="p-4 bg-rose-50 text-rose-500 rounded-full"><AlertCircle size={48} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">¿Borrar "{cascadeConfirmation.label}"?</h3>
                <p className="text-slate-500 text-sm font-medium">
                  {cascadeConfirmation.itemCount > 0
                    ? `Se eliminarán también ${cascadeConfirmation.itemCount} ítem${cascadeConfirmation.itemCount !== 1 ? 's' : ''} de catálogo debajo de este nivel.`
                    : 'No tiene ítems de catálogo debajo.'}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => setCascadeConfirmation(null)} className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={() => { cascadeConfirmation.onConfirm(); setCascadeConfirmation(null); }} className="flex-1 px-6 py-4 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Gestor de Estructura</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Gremios → Estancias → Tipo → Subcategorías → Ítems</p>

        <form onSubmit={e => { e.preventDefault(); if (newGuildName.trim()) { hierarchy.addGuild(newGuildName.trim()); setNewGuildName(''); } }} className="flex gap-2 mb-6">
          <input value={newGuildName} onChange={e => setNewGuildName(e.target.value)} placeholder="Nuevo gremio..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100" />
          <button type="submit" className="px-5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-1"><Plus size={14}/> Gremio</button>
        </form>

        <div className="space-y-3">
          {sortedGuilds.map((guild, gIdx) => {
            const guildRooms = hierarchy.rooms.filter(r => r.guildId === guild.firebaseId).sort((a, b) => a.order - b.order);
            const isExpanded = expandedGuilds.has(guild.firebaseId);
            return (
              <div key={guild.firebaseId} className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 p-4 bg-slate-50/60">
                  <button onClick={() => toggleGuild(guild.firebaseId)} className="text-slate-400 hover:text-slate-700">
                    {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                  {editing?.kind === 'guild' && editing.id === guild.firebaseId ? (
                    <input autoFocus value={editing.val} onChange={e => setEditing({ ...editing, val: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') { hierarchy.renameGuild(guild.firebaseId, editing.val.trim()); setEditing(null); } if (e.key === 'Escape') setEditing(null); }}
                      className="flex-1 p-2 bg-white border border-blue-300 rounded-lg text-sm font-bold outline-none" />
                  ) : (
                    <span className="flex-1 font-black text-slate-900">{guild.name}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <button disabled={gIdx === 0} onClick={() => { hierarchy.reorderGuild(sortedGuilds[gIdx - 1].firebaseId, guild.order); hierarchy.reorderGuild(guild.firebaseId, sortedGuilds[gIdx - 1].order); }} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowUp size={14}/></button>
                    <button disabled={gIdx === sortedGuilds.length - 1} onClick={() => { hierarchy.reorderGuild(sortedGuilds[gIdx + 1].firebaseId, guild.order); hierarchy.reorderGuild(guild.firebaseId, sortedGuilds[gIdx + 1].order); }} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowDown size={14}/></button>
                    <button onClick={() => setEditing({ kind: 'guild', id: guild.firebaseId, val: guild.name })} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Hammer size={14}/></button>
                    <button onClick={() => setCascadeConfirmation({ label: guild.name, itemCount: hierarchy.countItemsUnderGuild(guild.firebaseId), onConfirm: () => hierarchy.deleteGuildCascade(guild.firebaseId) })} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={14}/></button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 pl-10 space-y-3 border-t border-slate-100">
                    <form onSubmit={e => { e.preventDefault(); const v = (newRoomName[guild.firebaseId] || '').trim(); if (v) { hierarchy.addRoom(guild.firebaseId, v); setNewRoomName(p => ({ ...p, [guild.firebaseId]: '' })); } }} className="flex gap-2">
                      <input value={newRoomName[guild.firebaseId] || ''} onChange={e => setNewRoomName(p => ({ ...p, [guild.firebaseId]: e.target.value }))} placeholder="Nueva estancia..." className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
                      <button type="submit" className="px-4 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800">+ Estancia</button>
                    </form>

                    {guildRooms.map((room, rIdx) => {
                      const roomExpanded = expandedRooms.has(room.firebaseId);
                      return (
                        <div key={room.firebaseId} className="border border-slate-100 rounded-xl overflow-hidden">
                          <div className="flex items-center gap-2 p-3 bg-white">
                            <button onClick={() => toggleRoom(room.firebaseId)} className="text-slate-400 hover:text-slate-700">
                              {roomExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {editing?.kind === 'room' && editing.id === room.firebaseId ? (
                              <input autoFocus value={editing.val} onChange={e => setEditing({ ...editing, val: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') { hierarchy.renameRoom(guild.firebaseId, room.firebaseId, editing.val.trim()); setEditing(null); } if (e.key === 'Escape') setEditing(null); }}
                                className="flex-1 p-1.5 bg-slate-50 border border-blue-300 rounded-lg text-sm font-bold outline-none" />
                            ) : (
                              <span className="flex-1 font-bold text-slate-800 text-sm">{room.name}</span>
                            )}
                            <div className="flex items-center gap-1">
                              <button disabled={rIdx === 0} onClick={() => { hierarchy.reorderRoom(guild.firebaseId, guildRooms[rIdx - 1].firebaseId, room.order); hierarchy.reorderRoom(guild.firebaseId, room.firebaseId, guildRooms[rIdx - 1].order); }} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowUp size={12}/></button>
                              <button disabled={rIdx === guildRooms.length - 1} onClick={() => { hierarchy.reorderRoom(guild.firebaseId, guildRooms[rIdx + 1].firebaseId, room.order); hierarchy.reorderRoom(guild.firebaseId, room.firebaseId, guildRooms[rIdx + 1].order); }} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowDown size={12}/></button>
                              <button onClick={() => setEditing({ kind: 'room', id: room.firebaseId, val: room.name })} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg"><Hammer size={12}/></button>
                              <button onClick={() => setCascadeConfirmation({ label: room.name, itemCount: hierarchy.countItemsUnderRoom(guild.firebaseId, room.firebaseId), onConfirm: () => hierarchy.deleteRoomCascade(guild.firebaseId, room.firebaseId) })} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={12}/></button>
                            </div>
                          </div>

                          {roomExpanded && (
                            <div className="p-3 pl-8 space-y-4 border-t border-slate-50 bg-slate-50/40">
                              {(['tareas', 'material'] as CatalogType[]).map(type => {
                                const subcats = hierarchy.subcategories
                                  .filter(s => s.guildId === guild.firebaseId && s.roomId === room.firebaseId && s.type === type)
                                  .sort((a, b) => a.order - b.order);
                                const key = `${room.firebaseId}-${type}`;
                                return (
                                  <div key={type}>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{TYPE_LABELS[type]}</p>
                                    <div className="space-y-1.5">
                                      {subcats.map((sub, sIdx) => {
                                        const itemCount = hierarchy.countItemsUnderSubcategory(guild.firebaseId, room.firebaseId, type, sub.firebaseId);
                                        return (
                                          <div key={sub.firebaseId} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
                                            {editing?.kind === 'subcategory' && editing.id === sub.firebaseId ? (
                                              <input autoFocus value={editing.val} onChange={e => setEditing({ ...editing, val: e.target.value })}
                                                onKeyDown={e => { if (e.key === 'Enter') { hierarchy.renameSubcategory(guild.firebaseId, room.firebaseId, type, sub.firebaseId, editing.val.trim()); setEditing(null); } if (e.key === 'Escape') setEditing(null); }}
                                                className="flex-1 p-1 bg-slate-50 border border-blue-300 rounded-lg text-xs font-bold outline-none" />
                                            ) : (
                                              <span className="flex-1 text-xs font-bold text-slate-700">{sub.name} <span className="text-slate-300 font-medium">({itemCount})</span></span>
                                            )}
                                            <button disabled={sIdx === 0} onClick={() => { hierarchy.reorderSubcategory(guild.firebaseId, room.firebaseId, type, subcats[sIdx - 1].firebaseId, sub.order); hierarchy.reorderSubcategory(guild.firebaseId, room.firebaseId, type, sub.firebaseId, subcats[sIdx - 1].order); }} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowUp size={11}/></button>
                                            <button disabled={sIdx === subcats.length - 1} onClick={() => { hierarchy.reorderSubcategory(guild.firebaseId, room.firebaseId, type, subcats[sIdx + 1].firebaseId, sub.order); hierarchy.reorderSubcategory(guild.firebaseId, room.firebaseId, type, sub.firebaseId, subcats[sIdx + 1].order); }} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowDown size={11}/></button>
                                            <button onClick={() => setEditing({ kind: 'subcategory', id: sub.firebaseId, val: sub.name })} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg"><Hammer size={11}/></button>
                                            <button onClick={() => setCascadeConfirmation({ label: sub.name, itemCount, onConfirm: () => hierarchy.deleteSubcategoryCascade(guild.firebaseId, room.firebaseId, type, sub.firebaseId) })} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={11}/></button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <form onSubmit={e => {
                                      e.preventDefault();
                                      const v = (newSubcategoryName[key] || '').trim();
                                      if (v) { hierarchy.addSubcategory(guild.firebaseId, room.firebaseId, type, v); setNewSubcategoryName(p => ({ ...p, [key]: '' })); }
                                    }} className="flex gap-1.5 mt-2">
                                      <input value={newSubcategoryName[key] || ''} onChange={e => setNewSubcategoryName(p => ({ ...p, [key]: e.target.value }))} placeholder={`Nueva subcategoría de ${TYPE_LABELS[type].toLowerCase()}...`} className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100" />
                                      <button type="submit" className="px-3 bg-slate-700 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-800">+</button>
                                    </form>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {sortedGuilds.length === 0 && (
            <p className="text-center text-slate-300 italic py-10 text-sm">Sin gremios todavía. Añade el primero arriba.</p>
          )}
        </div>
      </div>
    </div>
  );
};
