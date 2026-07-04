import type { BudgetItem } from '../types';

export interface RoomGroup {
  roomName: string;
  items: BudgetItem[];
}

export interface GuildGroup {
  guildName: string;
  rooms: RoomGroup[];
}

// Groups budget/invoice items by their denormalized guildName, then roomName,
// preserving first-seen order at both levels.
export function groupItemsByGuildAndRoom(items: BudgetItem[]): GuildGroup[] {
  const guildOrder: string[] = [];
  const guildMap = new Map<string, Map<string, BudgetItem[]>>();

  items.forEach(item => {
    const guildKey = item.guildName || 'Sin gremio';
    const roomKey = item.roomName || 'Sin estancia';
    if (!guildMap.has(guildKey)) {
      guildMap.set(guildKey, new Map());
      guildOrder.push(guildKey);
    }
    const roomMap = guildMap.get(guildKey)!;
    if (!roomMap.has(roomKey)) roomMap.set(roomKey, []);
    roomMap.get(roomKey)!.push(item);
  });

  return guildOrder.map(guildName => ({
    guildName,
    rooms: [...guildMap.get(guildName)!.entries()].map(([roomName, roomItems]) => ({ roomName, items: roomItems })),
  }));
}
