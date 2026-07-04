import React, { useState } from 'react';
import { Users, Mail, Phone, MapPin, Pencil, X, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import type { Client } from '../types';
import type { ClientFormData } from '../hooks/useClients';
import { ClientModal } from './modals/ClientModal';

interface ClientsViewProps {
  clients: Client[];
  handleAddClient: (data: ClientFormData) => void;
  handleUpdateClient: (firebaseId: string, data: ClientFormData) => void;
  setDeleteConfirmation: (value: { id: any; type: string; label: string } | null) => void;
}

export const ClientsView = ({ clients, handleAddClient, handleUpdateClient, setDeleteConfirmation }: ClientsViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const openCreate = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleSave = (data: ClientFormData) => {
    if (editingClient?.firebaseId) {
      handleUpdateClient(editingClient.firebaseId, data);
    } else {
      handleAddClient(data);
    }
    setIsModalOpen(false);
    setEditingClient(null);
  };

  return (
    <div>
      <div className="flex justify-end mb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreate}
          className="text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 bg-blue-600 shadow-xl shadow-blue-100"
        >
          <Plus size={18} className="stroke-[3]" /> Nuevo Cliente
        </motion.button>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-16 text-center text-slate-400 font-bold">
          <Users size={40} className="mx-auto mb-4 text-slate-300" />
          No hay clientes todavía. Crea el primero.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {clients.map((client, idx) => (
            <motion.div
              key={client.firebaseId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex flex-col gap-6"
            >
              <div className="flex justify-between items-start">
                <div className="p-4 rounded-[1.5rem] bg-blue-50 text-blue-600">
                  <Users size={24} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(client)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation({ id: client.firebaseId, type: 'client', label: client.name })}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-1">{client.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{client.cif}</p>
              </div>
              <div className="space-y-2 pt-4 border-t border-slate-50 text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-300" /> {client.address}</div>
                <div className="flex items-center gap-2"><Mail size={14} className="text-slate-300" /> {client.email}</div>
                <div className="flex items-center gap-2"><Phone size={14} className="text-slate-300" /> {client.phone}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ClientModal
        isOpen={isModalOpen}
        editingClient={editingClient}
        onClose={() => { setIsModalOpen(false); setEditingClient(null); }}
        onSave={handleSave}
      />
    </div>
  );
};
