export type CatalogType = 'tareas' | 'material';

export interface Guild {
  firebaseId: string;
  name: string;
  order: number;
}

export interface Room {
  firebaseId: string;
  guildId: string;
  name: string;
  order: number;
}

export interface Subcategory {
  firebaseId: string;
  guildId: string;
  roomId: string;
  type: CatalogType;
  name: string;
  order: number;
}

export type CatalogItemMode = 'texto_libre' | 'medidas';

export interface HierarchicalCatalogItem {
  firebaseId: string;
  guildId: string;
  roomId: string;
  type: CatalogType;
  subcategoryId: string;
  mode: CatalogItemMode;
  // Modo texto libre
  description?: string;
  // Modo medidas
  largo?: number;
  ancho?: number;
  alto?: number;
  totalM2?: number;
  // Comunes
  unit: string;
  qty: number;
  price: number;
  total: number;
}
