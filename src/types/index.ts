export interface Project {
  id: number;
  firebaseId?: string;
  name: string;
  /** Client this project is assigned to. Absent for legacy projects created before the Clients collection existed. */
  clientId?: string;
  // Denormalized from Client at assignment time so historical projects survive edits/deletion of the client record.
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

export interface Client {
  id: number;
  firebaseId?: string;
  name: string;
  cif: string;
  address: string;
  email: string;
  phone: string;
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

export type CalendarEventType = 'planning' | 'meeting';

export const ERKIALE_PROJECT_ID = 'erkiale';

export interface CalendarEvent {
  id: number;
  firebaseId?: string;
  /** Real project firebaseId, or ERKIALE_PROJECT_ID for company-wide events not tied to a project. */
  projectId: string;
  type: CalendarEventType;
  task: string;
  worker: string;
  status: 'pendiente' | 'urgente';
  /** Range start (type 'planning') or the single day (type 'meeting'). */
  startDate: string;
  /** Range end — only for type 'planning'. */
  endDate?: string;
  /** Only for type 'meeting'. */
  startTime?: string;
  endTime?: string;
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
  /** Guild/Room this item's catalog entry belonged to, denormalized so they survive the guild/room being renamed/deleted later. */
  guildId?: string;
  guildName?: string;
  roomId?: string;
  roomName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
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
