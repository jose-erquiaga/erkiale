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

export interface HierarchicalCatalogItem {
  firebaseId: string;
  guildId: string;
  roomId: string;
  type: CatalogType;
  subcategoryId: string;
  description: string;
  unit: string;
  price: number;
}
