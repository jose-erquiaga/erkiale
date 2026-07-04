import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, Hammer, ChevronDown, ChevronUp, ArrowUp, ArrowDown, AlertCircle, Lock, GripVertical, Copy, Move } from 'lucide-react';
import { isAdmin } from '../lib/firebase';
import { useCatalogHierarchy } from '../hooks/useCatalogHierarchy';
import type { CatalogType, HierarchicalCatalogItem } from '../types/catalogHierarchy';

const TYPE_LABELS: Record<CatalogType, string> = {
  tareas: 'Tareas a realizar',
  material: 'Material',
};

interface CascadeConfirmation {
  label: string;
  itemCount: number;
  onConfirm: () => void;
}

type DragPayload =
  | { kind: 'room'; guildId: string; roomId: string; name: string }
  | { kind: 'subcategory'; guildId: string; roomId: string; type: CatalogType; subcategoryId: string; name: string }
  | { kind: 'item'; guildId: string; roomId: string; type: CatalogType; subcategoryId: string; itemId: string; name: string };

type DropPayload =
  | { kind: 'guild'; guildId: string; name: string }
  | { kind: 'room'; guildId: string; roomId: string; name: string }
  | { kind: 'subcategory'; guildId: string; roomId: string; type: CatalogType; subcategoryId: string; name: string };

interface PendingDrop {
  source: DragPayload;
  target: DropPayload;
}

const itemLabel = (item: HierarchicalCatalogItem) =>
  item.mode === 'texto_libre'
    ? (item.description || '(sin descripción)')
    : `${item.largo ?? '?'}×${item.ancho ?? '?'}${item.alto ? `×${item.alto}` : ''} (${(item.totalM2 ?? 0).toFixed(2)} m²)`;

function DragHandle({ listeners, attributes }: { listeners: ReturnType<typeof useDraggable>['listeners']; attributes: ReturnType<typeof useDraggable>['attributes'] }) {
  return (
    <button type="button" {...listeners} {...attributes} className="p-1.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none">
      <GripVertical size={14} />
    </button>
  );
}

function ItemBox({ item, onDelete }: { item: HierarchicalCatalogItem; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `item:${item.firebaseId}`,
    data: { kind: 'item', guildId: item.guildId, roomId: item.roomId, type: item.type, subcategoryId: item.subcategoryId, itemId: item.firebaseId, name: itemLabel(item) } as DragPayload,
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={`flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 relative ${isDragging ? 'opacity-40 z-50' : ''}`}>
      <DragHandle listeners={listeners} attributes={attributes} />
      <span className="flex-1 text-xs font-bold text-slate-700">{itemLabel(item)} <span className="text-slate-300 font-medium">— {item.total.toFixed(2)} €</span></span>
      <button onClick={onDelete} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={11} /></button>
    </div>
  );
}

function SubcategoryBox({
  guildId, roomId, type, subcategory, itemCount, subItems, expanded, onToggle,
  editing, setEditing, onRename, onReorderUp, onReorderDown, canReorderUp, canReorderDown, onDelete, onDeleteItem,
}: {
  guildId: string; roomId: string; type: CatalogType;
  subcategory: { firebaseId: string; name: string; order: number };
  itemCount: number;
  subItems: HierarchicalCatalogItem[];
  expanded: boolean;
  onToggle: () => void;
  editing: { kind: string; id: string; val: string } | null;
  setEditing: (v: { kind: string; id: string; val: string } | null) => void;
  onRename: (val: string) => void;
  onReorderUp: () => void;
  onReorderDown: () => void;
  canReorderUp: boolean;
  canReorderDown: boolean;
  onDelete: () => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging, transform } = useDraggable({
    id: `subcategory:${subcategory.firebaseId}`,
    data: { kind: 'subcategory', guildId, roomId, type, subcategoryId: subcategory.firebaseId, name: subcategory.name } as DragPayload,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `subcategory-drop:${subcategory.firebaseId}`,
    data: { kind: 'subcategory', guildId, roomId, type, subcategoryId: subcategory.firebaseId, name: subcategory.name } as DropPayload,
  });
  const setRefs = (node: HTMLElement | null) => { setDragRef(node); setDropRef(node); };

  return (
    <div ref={setRefs} style={{ transform: CSS.Translate.toString(transform) }} className={`bg-white rounded-lg border relative ${isOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-100'} ${isDragging ? 'opacity-40 z-50' : ''}`}>
      <div className="flex items-center gap-1 p-2">
        <DragHandle listeners={listeners} attributes={attributes} />
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-700">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {editing?.kind === 'subcategory' && editing.id === subcategory.firebaseId ? (
          <input autoFocus value={editing.val} onChange={e => setEditing({ ...editing, val: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') { onRename(editing.val.trim()); setEditing(null); } if (e.key === 'Escape') setEditing(null); }}
            className="flex-1 p-1 bg-slate-50 border border-blue-300 rounded-lg text-xs font-bold outline-none" />
        ) : (
          <span className="flex-1 text-xs font-bold text-slate-700">{subcategory.name} <span className="text-slate-300 font-medium">({itemCount})</span></span>
        )}
        <button disabled={!canReorderUp} onClick={onReorderUp} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowUp size={11} /></button>
        <button disabled={!canReorderDown} onClick={onReorderDown} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowDown size={11} /></button>
        <button onClick={() => setEditing({ kind: 'subcategory', id: subcategory.firebaseId, val: subcategory.name })} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg"><Hammer size={11} /></button>
        <button onClick={onDelete} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={11} /></button>
      </div>
      {expanded && (
        <div className="p-2 pl-6 space-y-1.5 border-t border-slate-50">
          {subItems.length === 0 && <p className="text-[10px] text-slate-300 italic py-1">Sin ítems. Añádelos desde Catálogo Jerárquico.</p>}
          {subItems.map(item => (
            <ItemBox key={item.firebaseId} item={item} onDelete={() => onDeleteItem(item.firebaseId)} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomBox({
  guild, room, guildRooms, rIdx, subcategories, items, expanded, onToggle,
  editing, setEditing, hierarchy, expandedSubcats, toggleSubcat, setCascadeConfirmation,
}: {
  guild: { firebaseId: string; name: string };
  room: { firebaseId: string; name: string; order: number };
  guildRooms: { firebaseId: string; order: number }[];
  rIdx: number;
  subcategories: { firebaseId: string; name: string; order: number; type: CatalogType; guildId: string; roomId: string }[];
  items: HierarchicalCatalogItem[];
  expanded: boolean;
  onToggle: () => void;
  editing: { kind: string; id: string; val: string } | null;
  setEditing: (v: { kind: string; id: string; val: string } | null) => void;
  hierarchy: ReturnType<typeof useCatalogHierarchy>;
  expandedSubcats: Set<string>;
  toggleSubcat: (id: string) => void;
  setCascadeConfirmation: (v: CascadeConfirmation | null) => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging, transform } = useDraggable({
    id: `room:${room.firebaseId}`,
    data: { kind: 'room', guildId: guild.firebaseId, roomId: room.firebaseId, name: room.name } as DragPayload,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `room-drop:${room.firebaseId}`,
    data: { kind: 'room', guildId: guild.firebaseId, roomId: room.firebaseId, name: room.name } as DropPayload,
  });
  const setRefs = (node: HTMLElement | null) => { setDragRef(node); setDropRef(node); };
  const [newSubcategoryName, setNewSubcategoryName] = useState<Record<string, string>>({});

  return (
    <div ref={setRefs} style={{ transform: CSS.Translate.toString(transform) }} className={`border rounded-xl overflow-hidden relative ${isOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-100'} ${isDragging ? 'opacity-40 z-50' : ''}`}>
      <div className="flex items-center gap-1 p-3 bg-white">
        <DragHandle listeners={listeners} attributes={attributes} />
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-700">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {editing?.kind === 'room' && editing.id === room.firebaseId ? (
          <input autoFocus value={editing.val} onChange={e => setEditing({ ...editing, val: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') { hierarchy.renameRoom(guild.firebaseId, room.firebaseId, editing.val.trim()); setEditing(null); } if (e.key === 'Escape') setEditing(null); }}
            className="flex-1 p-1.5 bg-slate-50 border border-blue-300 rounded-lg text-sm font-bold outline-none" />
        ) : (
          <span className="flex-1 font-bold text-slate-800 text-sm">{room.name}</span>
        )}
        <button disabled={rIdx === 0} onClick={() => { hierarchy.reorderRoom(guild.firebaseId, guildRooms[rIdx - 1].firebaseId, room.order); hierarchy.reorderRoom(guild.firebaseId, room.firebaseId, guildRooms[rIdx - 1].order); }} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowUp size={12} /></button>
        <button disabled={rIdx === guildRooms.length - 1} onClick={() => { hierarchy.reorderRoom(guild.firebaseId, guildRooms[rIdx + 1].firebaseId, room.order); hierarchy.reorderRoom(guild.firebaseId, room.firebaseId, guildRooms[rIdx + 1].order); }} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowDown size={12} /></button>
        <button onClick={() => setEditing({ kind: 'room', id: room.firebaseId, val: room.name })} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg"><Hammer size={12} /></button>
        <button onClick={() => setCascadeConfirmation({ label: room.name, itemCount: hierarchy.countItemsUnderRoom(guild.firebaseId, room.firebaseId), onConfirm: () => hierarchy.deleteRoomCascade(guild.firebaseId, room.firebaseId) })} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={12} /></button>
      </div>

      {expanded && (
        <div className="p-3 pl-8 space-y-4 border-t border-slate-50 bg-slate-50/40">
          {(['tareas', 'material'] as CatalogType[]).map(type => {
            const subcats = subcategories
              .filter(s => s.roomId === room.firebaseId && s.type === type)
              .sort((a, b) => a.order - b.order);
            const key = `${room.firebaseId}-${type}`;
            return (
              <div key={type}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{TYPE_LABELS[type]}</p>
                <div className="space-y-1.5">
                  {subcats.map((sub, sIdx) => (
                    <SubcategoryBox
                      key={sub.firebaseId}
                      guildId={guild.firebaseId}
                      roomId={room.firebaseId}
                      type={type}
                      subcategory={sub}
                      itemCount={hierarchy.countItemsUnderSubcategory(guild.firebaseId, room.firebaseId, type, sub.firebaseId)}
                      subItems={items.filter(i => i.subcategoryId === sub.firebaseId)}
                      expanded={expandedSubcats.has(sub.firebaseId)}
                      onToggle={() => toggleSubcat(sub.firebaseId)}
                      editing={editing}
                      setEditing={setEditing}
                      onRename={val => hierarchy.renameSubcategory(guild.firebaseId, room.firebaseId, type, sub.firebaseId, val)}
                      onReorderUp={() => { hierarchy.reorderSubcategory(guild.firebaseId, room.firebaseId, type, subcats[sIdx - 1].firebaseId, sub.order); hierarchy.reorderSubcategory(guild.firebaseId, room.firebaseId, type, sub.firebaseId, subcats[sIdx - 1].order); }}
                      onReorderDown={() => { hierarchy.reorderSubcategory(guild.firebaseId, room.firebaseId, type, subcats[sIdx + 1].firebaseId, sub.order); hierarchy.reorderSubcategory(guild.firebaseId, room.firebaseId, type, sub.firebaseId, subcats[sIdx + 1].order); }}
                      canReorderUp={sIdx > 0}
                      canReorderDown={sIdx < subcats.length - 1}
                      onDelete={() => setCascadeConfirmation({ label: sub.name, itemCount: hierarchy.countItemsUnderSubcategory(guild.firebaseId, room.firebaseId, type, sub.firebaseId), onConfirm: () => hierarchy.deleteSubcategoryCascade(guild.firebaseId, room.firebaseId, type, sub.firebaseId) })}
                      onDeleteItem={itemId => hierarchy.deleteItem(guild.firebaseId, room.firebaseId, type, sub.firebaseId, itemId)}
                    />
                  ))}
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
}

function GuildBox({
  guild, sortedGuilds, gIdx, hierarchy, expandedGuilds, toggleGuild, expandedRooms, toggleRoom,
  expandedSubcats, toggleSubcat, editing, setEditing, setCascadeConfirmation,
}: {
  guild: { firebaseId: string; name: string; order: number };
  sortedGuilds: { firebaseId: string; order: number }[];
  gIdx: number;
  hierarchy: ReturnType<typeof useCatalogHierarchy>;
  expandedGuilds: Set<string>;
  toggleGuild: (id: string) => void;
  expandedRooms: Set<string>;
  toggleRoom: (id: string) => void;
  expandedSubcats: Set<string>;
  toggleSubcat: (id: string) => void;
  editing: { kind: string; id: string; val: string } | null;
  setEditing: (v: { kind: string; id: string; val: string } | null) => void;
  setCascadeConfirmation: (v: CascadeConfirmation | null) => void;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `guild-drop:${guild.firebaseId}`,
    data: { kind: 'guild', guildId: guild.firebaseId, name: guild.name } as DropPayload,
  });
  const [newRoomName, setNewRoomName] = useState('');
  const isExpanded = expandedGuilds.has(guild.firebaseId);
  const guildRooms = hierarchy.rooms.filter(r => r.guildId === guild.firebaseId).sort((a, b) => a.order - b.order);

  return (
    <div ref={setDropRef} className={`border rounded-2xl overflow-hidden ${isOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2 p-4 bg-slate-50/60">
        <button onClick={() => toggleGuild(guild.firebaseId)} className="text-slate-400 hover:text-slate-700">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {editing?.kind === 'guild' && editing.id === guild.firebaseId ? (
          <input autoFocus value={editing.val} onChange={e => setEditing({ ...editing, val: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') { hierarchy.renameGuild(guild.firebaseId, editing.val.trim()); setEditing(null); } if (e.key === 'Escape') setEditing(null); }}
            className="flex-1 p-2 bg-white border border-blue-300 rounded-lg text-sm font-bold outline-none" />
        ) : (
          <span className="flex-1 font-black text-slate-900">{guild.name}</span>
        )}
        <div className="flex items-center gap-1">
          <button disabled={gIdx === 0} onClick={() => { hierarchy.reorderGuild(sortedGuilds[gIdx - 1].firebaseId, guild.order); hierarchy.reorderGuild(guild.firebaseId, sortedGuilds[gIdx - 1].order); }} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowUp size={14} /></button>
          <button disabled={gIdx === sortedGuilds.length - 1} onClick={() => { hierarchy.reorderGuild(sortedGuilds[gIdx + 1].firebaseId, guild.order); hierarchy.reorderGuild(guild.firebaseId, sortedGuilds[gIdx + 1].order); }} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowDown size={14} /></button>
          <button onClick={() => setEditing({ kind: 'guild', id: guild.firebaseId, val: guild.name })} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Hammer size={14} /></button>
          <button onClick={() => setCascadeConfirmation({ label: guild.name, itemCount: hierarchy.countItemsUnderGuild(guild.firebaseId), onConfirm: () => hierarchy.deleteGuildCascade(guild.firebaseId) })} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><X size={14} /></button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pl-10 space-y-3 border-t border-slate-100">
          <form onSubmit={e => { e.preventDefault(); if (newRoomName.trim()) { hierarchy.addRoom(guild.firebaseId, newRoomName.trim()); setNewRoomName(''); } }} className="flex gap-2">
            <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="Nueva estancia..." className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
            <button type="submit" className="px-4 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800">+ Estancia</button>
          </form>

          {guildRooms.map((room, rIdx) => (
            <RoomBox
              key={room.firebaseId}
              guild={guild}
              room={room}
              guildRooms={guildRooms}
              rIdx={rIdx}
              subcategories={hierarchy.subcategories.filter(s => s.guildId === guild.firebaseId && s.roomId === room.firebaseId)}
              items={hierarchy.items.filter(i => i.guildId === guild.firebaseId && i.roomId === room.firebaseId)}
              expanded={expandedRooms.has(room.firebaseId)}
              onToggle={() => toggleRoom(room.firebaseId)}
              editing={editing}
              setEditing={setEditing}
              hierarchy={hierarchy}
              expandedSubcats={expandedSubcats}
              toggleSubcat={toggleSubcat}
              setCascadeConfirmation={setCascadeConfirmation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const StructureManagerView = ({ user }: { user: unknown }) => {
  const hierarchy = useCatalogHierarchy(user);
  const [expandedGuilds, setExpandedGuilds] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedSubcats, setExpandedSubcats] = useState<Set<string>>(new Set());
  const [newGuildName, setNewGuildName] = useState('');
  const [editing, setEditing] = useState<{ kind: string; id: string; val: string } | null>(null);
  const [cascadeConfirmation, setCascadeConfirmation] = useState<CascadeConfirmation | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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
  const toggleSubcat = (id: string) => setExpandedSubcats(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const sortedGuilds = [...hierarchy.guilds].sort((a, b) => a.order - b.order);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const source = active.data.current as DragPayload | undefined;
    const target = over.data.current as DropPayload | undefined;
    if (!source || !target) return;

    if (source.kind === 'room' && target.kind === 'guild') {
      if (source.guildId === target.guildId) return;
      setPendingDrop({ source, target });
    } else if (source.kind === 'subcategory' && target.kind === 'room') {
      if (source.guildId === target.guildId && source.roomId === target.roomId) return;
      setPendingDrop({ source, target });
    } else if (source.kind === 'item' && target.kind === 'subcategory') {
      if (source.subcategoryId === target.subcategoryId) return;
      setPendingDrop({ source, target });
    }
  };

  const applyPendingDrop = async (mode: 'move' | 'copy') => {
    if (!pendingDrop) return;
    const { source, target } = pendingDrop;
    if (source.kind === 'room' && target.kind === 'guild') {
      await (mode === 'move' ? hierarchy.moveRoom : hierarchy.copyRoom)(source.guildId, source.roomId, target.guildId);
    } else if (source.kind === 'subcategory' && target.kind === 'room') {
      await (mode === 'move' ? hierarchy.moveSubcategory : hierarchy.copySubcategory)(source.guildId, source.roomId, source.type, source.subcategoryId, target.guildId, target.roomId);
    } else if (source.kind === 'item' && target.kind === 'subcategory') {
      await (mode === 'move' ? hierarchy.moveItem : hierarchy.copyItem)(source.guildId, source.roomId, source.type, source.subcategoryId, source.itemId, target.guildId, target.roomId, target.type, target.subcategoryId);
    }
    setPendingDrop(null);
  };

  const deletePendingSource = () => {
    if (!pendingDrop) return;
    const { source } = pendingDrop;
    if (source.kind === 'room') {
      setCascadeConfirmation({ label: source.name, itemCount: hierarchy.countItemsUnderRoom(source.guildId, source.roomId), onConfirm: () => hierarchy.deleteRoomCascade(source.guildId, source.roomId) });
    } else if (source.kind === 'subcategory') {
      setCascadeConfirmation({ label: source.name, itemCount: hierarchy.countItemsUnderSubcategory(source.guildId, source.roomId, source.type, source.subcategoryId), onConfirm: () => hierarchy.deleteSubcategoryCascade(source.guildId, source.roomId, source.type, source.subcategoryId) });
    } else if (source.kind === 'item') {
      setCascadeConfirmation({ label: source.name, itemCount: 0, onConfirm: () => hierarchy.deleteItem(source.guildId, source.roomId, source.type, source.subcategoryId, source.itemId) });
    }
    setPendingDrop(null);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-6 max-w-5xl mx-auto">
        {pendingDrop && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <div onClick={() => setPendingDrop(null)} className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" />
            <div className="bg-white rounded-[2rem] p-10 w-full max-w-md relative z-10 shadow-2xl">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="p-4 bg-blue-50 text-blue-500 rounded-full"><Move size={40} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">"{pendingDrop.source.name}" → "{pendingDrop.target.name}"</h3>
                  <p className="text-slate-500 text-sm font-medium">Elige qué hacer con este elemento.</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <button onClick={() => applyPendingDrop('copy')} className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-50 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:bg-blue-100 transition-all"><Copy size={14} /> Copiar aquí</button>
                  <button onClick={() => applyPendingDrop('move')} className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"><Move size={14} /> Mover aquí</button>
                  <button onClick={deletePendingSource} className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-rose-50 text-rose-600 font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all"><X size={14} /> Borrar original</button>
                  <button onClick={() => setPendingDrop(null)} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all">Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}

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
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Gremios → Estancias → Tipo → Subcategorías → Ítems — arrastra una caja sobre otra para mover o copiar</p>

          <form onSubmit={e => { e.preventDefault(); if (newGuildName.trim()) { hierarchy.addGuild(newGuildName.trim()); setNewGuildName(''); } }} className="flex gap-2 mb-6">
            <input value={newGuildName} onChange={e => setNewGuildName(e.target.value)} placeholder="Nuevo gremio..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100" />
            <button type="submit" className="px-5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-1"><Plus size={14} /> Gremio</button>
          </form>

          <div className="space-y-3">
            {sortedGuilds.map((guild, gIdx) => (
              <GuildBox
                key={guild.firebaseId}
                guild={guild}
                sortedGuilds={sortedGuilds}
                gIdx={gIdx}
                hierarchy={hierarchy}
                expandedGuilds={expandedGuilds}
                toggleGuild={toggleGuild}
                expandedRooms={expandedRooms}
                toggleRoom={toggleRoom}
                expandedSubcats={expandedSubcats}
                toggleSubcat={toggleSubcat}
                editing={editing}
                setEditing={setEditing}
                setCascadeConfirmation={setCascadeConfirmation}
              />
            ))}
            {sortedGuilds.length === 0 && (
              <p className="text-center text-slate-300 italic py-10 text-sm">Sin gremios todavía. Añade el primero arriba.</p>
            )}
          </div>
        </div>
      </div>
    </DndContext>
  );
};
