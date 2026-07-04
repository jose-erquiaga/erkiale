import { useState, useEffect } from 'react';
import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { Guild, Room, Subcategory, HierarchicalCatalogItem, CatalogType } from '../types/catalogHierarchy';

const subcategoryDoc = (guildId: string, roomId: string, type: CatalogType, subcategoryId: string) =>
  doc(db, 'guilds', guildId, 'rooms', roomId, 'types', type, 'subcategories', subcategoryId);

const itemsCollection = (guildId: string, roomId: string, type: CatalogType, subcategoryId: string) =>
  collection(db, 'guilds', guildId, 'rooms', roomId, 'types', type, 'subcategories', subcategoryId, 'items');

export function useCatalogHierarchy(user: unknown) {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<HierarchicalCatalogItem[]>([]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;

    const guildsUnsub = onSnapshot(collection(db, 'guilds'), snap => {
      setGuilds(snap.docs.map(d => ({ ...d.data(), firebaseId: d.id } as Guild)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'guilds'));

    // collectionGroup queries give a flat, realtime view across every guild/room
    // without having to fan out a listener per node — parent ids are recovered
    // from each doc's ref chain.
    const roomsUnsub = onSnapshot(collectionGroup(db, 'rooms'), snap => {
      setRooms(snap.docs.map(d => {
        const guildId = d.ref.parent.parent!.id;
        return { ...d.data(), firebaseId: d.id, guildId } as Room;
      }));
    }, err => handleFirestoreError(err, OperationType.LIST, 'rooms'));

    const subcatsUnsub = onSnapshot(collectionGroup(db, 'subcategories'), snap => {
      setSubcategories(snap.docs.map(d => {
        const typeRef = d.ref.parent.parent!;
        const roomRef = typeRef.parent.parent!;
        const guildRef = roomRef.parent.parent!;
        return {
          ...d.data(),
          firebaseId: d.id,
          type: typeRef.id as CatalogType,
          roomId: roomRef.id,
          guildId: guildRef.id,
        } as Subcategory;
      }));
    }, err => handleFirestoreError(err, OperationType.LIST, 'subcategories'));

    const itemsUnsub = onSnapshot(collectionGroup(db, 'items'), snap => {
      setItems(snap.docs.map(d => {
        const subcatRef = d.ref.parent.parent!;
        const typeRef = subcatRef.parent.parent!;
        const roomRef = typeRef.parent.parent!;
        const guildRef = roomRef.parent.parent!;
        return {
          ...d.data(),
          firebaseId: d.id,
          subcategoryId: subcatRef.id,
          type: typeRef.id as CatalogType,
          roomId: roomRef.id,
          guildId: guildRef.id,
        } as HierarchicalCatalogItem;
      }));
    }, err => handleFirestoreError(err, OperationType.LIST, 'items'));

    return () => {
      guildsUnsub();
      roomsUnsub();
      subcatsUnsub();
      itemsUnsub();
    };
  }, [user]);

  // --- Guild CRUD ---
  const addGuild = async (name: string) => {
    try {
      await addDoc(collection(db, 'guilds'), { name, order: guilds.length });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'guilds');
    }
  };
  const renameGuild = async (guildId: string, name: string) => {
    try {
      await updateDoc(doc(db, 'guilds', guildId), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guilds/${guildId}`);
    }
  };
  const reorderGuild = async (guildId: string, order: number) => {
    try {
      await updateDoc(doc(db, 'guilds', guildId), { order });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guilds/${guildId}`);
    }
  };

  // --- Room CRUD ---
  const addRoom = async (guildId: string, name: string) => {
    try {
      const order = rooms.filter(r => r.guildId === guildId).length;
      await addDoc(collection(db, 'guilds', guildId, 'rooms'), { name, order });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `guilds/${guildId}/rooms`);
    }
  };
  const renameRoom = async (guildId: string, roomId: string, name: string) => {
    try {
      await updateDoc(doc(db, 'guilds', guildId, 'rooms', roomId), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guilds/${guildId}/rooms/${roomId}`);
    }
  };
  const reorderRoom = async (guildId: string, roomId: string, order: number) => {
    try {
      await updateDoc(doc(db, 'guilds', guildId, 'rooms', roomId), { order });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guilds/${guildId}/rooms/${roomId}`);
    }
  };

  // --- Subcategory CRUD ---
  const addSubcategory = async (guildId: string, roomId: string, type: CatalogType, name: string) => {
    try {
      const order = subcategories.filter(s => s.guildId === guildId && s.roomId === roomId && s.type === type).length;
      await addDoc(collection(db, 'guilds', guildId, 'rooms', roomId, 'types', type, 'subcategories'), { name, order });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `guilds/${guildId}/rooms/${roomId}/types/${type}/subcategories`);
    }
  };
  const renameSubcategory = async (guildId: string, roomId: string, type: CatalogType, subcategoryId: string, name: string) => {
    try {
      await updateDoc(subcategoryDoc(guildId, roomId, type, subcategoryId), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `.../subcategories/${subcategoryId}`);
    }
  };
  const reorderSubcategory = async (guildId: string, roomId: string, type: CatalogType, subcategoryId: string, order: number) => {
    try {
      await updateDoc(subcategoryDoc(guildId, roomId, type, subcategoryId), { order });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `.../subcategories/${subcategoryId}`);
    }
  };

  // --- Item CRUD ---
  const addItem = async (
    guildId: string, roomId: string, type: CatalogType, subcategoryId: string,
    item: Omit<HierarchicalCatalogItem, 'firebaseId' | 'guildId' | 'roomId' | 'type' | 'subcategoryId'>
  ) => {
    try {
      await addDoc(itemsCollection(guildId, roomId, type, subcategoryId), item);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `.../subcategories/${subcategoryId}/items`);
      return false;
    }
  };
  const updateItem = async (
    guildId: string, roomId: string, type: CatalogType, subcategoryId: string, itemId: string,
    patch: Partial<HierarchicalCatalogItem>
  ) => {
    try {
      await updateDoc(doc(itemsCollection(guildId, roomId, type, subcategoryId), itemId), patch);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `.../items/${itemId}`);
    }
  };
  const deleteItem = async (guildId: string, roomId: string, type: CatalogType, subcategoryId: string, itemId: string) => {
    try {
      await deleteDoc(doc(itemsCollection(guildId, roomId, type, subcategoryId), itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `.../items/${itemId}`);
    }
  };

  // --- Descendant counts (for cascade-delete confirmation) ---
  const countItemsUnderSubcategory = (guildId: string, roomId: string, type: CatalogType, subcategoryId: string) =>
    items.filter(i => i.guildId === guildId && i.roomId === roomId && i.type === type && i.subcategoryId === subcategoryId).length;

  const countItemsUnderRoom = (guildId: string, roomId: string) =>
    items.filter(i => i.guildId === guildId && i.roomId === roomId).length;

  const countItemsUnderGuild = (guildId: string) =>
    items.filter(i => i.guildId === guildId).length;

  // --- Cascading delete (bottom-up: items -> subcategory/room/guild) ---
  const deleteSubcategoryCascade = async (guildId: string, roomId: string, type: CatalogType, subcategoryId: string) => {
    try {
      const itemsToDelete = items.filter(i => i.guildId === guildId && i.roomId === roomId && i.type === type && i.subcategoryId === subcategoryId);
      const batch = writeBatch(db);
      itemsToDelete.forEach(i => batch.delete(doc(itemsCollection(guildId, roomId, type, subcategoryId), i.firebaseId)));
      batch.delete(subcategoryDoc(guildId, roomId, type, subcategoryId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `.../subcategories/${subcategoryId}`);
    }
  };

  const deleteRoomCascade = async (guildId: string, roomId: string) => {
    try {
      const subcatsToDelete = subcategories.filter(s => s.guildId === guildId && s.roomId === roomId);
      const itemsToDelete = items.filter(i => i.guildId === guildId && i.roomId === roomId);
      const batch = writeBatch(db);
      itemsToDelete.forEach(i => batch.delete(doc(itemsCollection(guildId, roomId, i.type, i.subcategoryId), i.firebaseId)));
      subcatsToDelete.forEach(s => batch.delete(subcategoryDoc(guildId, roomId, s.type, s.firebaseId)));
      batch.delete(doc(db, 'guilds', guildId, 'rooms', roomId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `guilds/${guildId}/rooms/${roomId}`);
    }
  };

  const deleteGuildCascade = async (guildId: string) => {
    try {
      const roomsToDelete = rooms.filter(r => r.guildId === guildId);
      const subcatsToDelete = subcategories.filter(s => s.guildId === guildId);
      const itemsToDelete = items.filter(i => i.guildId === guildId);
      const batch = writeBatch(db);
      itemsToDelete.forEach(i => batch.delete(doc(itemsCollection(guildId, i.roomId, i.type, i.subcategoryId), i.firebaseId)));
      subcatsToDelete.forEach(s => batch.delete(subcategoryDoc(guildId, s.roomId, s.type, s.firebaseId)));
      roomsToDelete.forEach(r => batch.delete(doc(db, 'guilds', guildId, 'rooms', r.firebaseId)));
      batch.delete(doc(db, 'guilds', guildId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `guilds/${guildId}`);
    }
  };

  return {
    guilds,
    rooms,
    subcategories,
    items,
    addGuild,
    renameGuild,
    reorderGuild,
    deleteGuildCascade,
    addRoom,
    renameRoom,
    reorderRoom,
    deleteRoomCascade,
    addSubcategory,
    renameSubcategory,
    reorderSubcategory,
    deleteSubcategoryCascade,
    addItem,
    updateItem,
    deleteItem,
    countItemsUnderSubcategory,
    countItemsUnderRoom,
    countItemsUnderGuild,
  };
}
