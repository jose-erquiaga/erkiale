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
}

export interface ExpenseItem {
  id: number;
  firebaseId?: string;
  concept: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  date: string;
  category: string;
  attachmentUrl?: string;
}
