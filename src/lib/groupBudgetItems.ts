import type { BudgetItem } from '../types';

export interface SubcategoryGroup {
  subcategoryName: string;
  items: BudgetItem[];
}

export interface RoomGroup {
  roomName: string;
  subcategories: SubcategoryGroup[];
}

export interface GuildGroup {
  guildName: string;
  rooms: RoomGroup[];
}

// Groups budget/invoice items by their denormalized guildName, then roomName,
// then subcategoryName, preserving first-seen order at every level.
export function groupItemsByGuildAndRoom(items: BudgetItem[]): GuildGroup[] {
  const guildOrder: string[] = [];
  const guildMap = new Map<string, { roomOrder: string[]; roomMap: Map<string, { subcatOrder: string[]; subcatMap: Map<string, BudgetItem[]> }> }>();

  items.forEach(item => {
    const guildKey = item.guildName || 'Sin gremio';
    const roomKey = item.roomName || 'Sin estancia';
    const subcatKey = item.subcategoryName || 'Sin subcategoría';

    if (!guildMap.has(guildKey)) {
      guildMap.set(guildKey, { roomOrder: [], roomMap: new Map() });
      guildOrder.push(guildKey);
    }
    const guildEntry = guildMap.get(guildKey)!;

    if (!guildEntry.roomMap.has(roomKey)) {
      guildEntry.roomMap.set(roomKey, { subcatOrder: [], subcatMap: new Map() });
      guildEntry.roomOrder.push(roomKey);
    }
    const roomEntry = guildEntry.roomMap.get(roomKey)!;

    if (!roomEntry.subcatMap.has(subcatKey)) {
      roomEntry.subcatMap.set(subcatKey, []);
      roomEntry.subcatOrder.push(subcatKey);
    }
    roomEntry.subcatMap.get(subcatKey)!.push(item);
  });

  return guildOrder.map(guildName => {
    const guildEntry = guildMap.get(guildName)!;
    return {
      guildName,
      rooms: guildEntry.roomOrder.map(roomName => {
        const roomEntry = guildEntry.roomMap.get(roomName)!;
        return {
          roomName,
          subcategories: roomEntry.subcatOrder.map(subcategoryName => ({
            subcategoryName,
            items: roomEntry.subcatMap.get(subcategoryName)!,
          })),
        };
      }),
    };
  });
}
