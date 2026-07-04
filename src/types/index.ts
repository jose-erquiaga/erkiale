export interface Project {
  id: number;
  firebaseId?: string;
  name: string;
  clientName: string;
  clientCIF: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  status: 'En curso' | 'Pendiente' | 'Finalizado';
  category: string;
  color?: string;
  ownerId?: string;
}

export interface CompanyInfo {
  name: string;
  cif: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export interface CatalogItem {
  id: number;
  firebaseId?: string;
  category: string;
  concept: string;
  unit: string;
  price: number;
}

export interface CalendarEvent {
  id: number;
  firebaseId?: string;
  projectId: number;
  date: string;
  time: string;
  worker: string;
  task: string;
  status: 'pendiente' | 'urgente';
}

export interface BudgetItem {
  id: number;
  firebaseId?: string;
  concept: string;
  description?: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  /** Tareas/Material classification, inherited from the catalog item this was copied from. */
  tipo?: 'tareas' | 'material';
}

export type ExpensePaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'a_cuenta';

export interface ExpenseItem {
  id: number;
  firebaseId?: string;
  concept: string;
  date: string;
  provider: string;
  tipo: 'material' | 'trabajo';
  /** Present when tipo === 'material': base imponible. */
  base?: number;
  /** Present when tipo === 'material': cuota de IVA. */
  iva?: number;
  /** Present when tipo === 'trabajo': importe directo, sin desglose de IVA. */
  amount?: number;
  total: number;
  paymentMethod: ExpensePaymentMethod;
  attachmentUrl?: string;
}
