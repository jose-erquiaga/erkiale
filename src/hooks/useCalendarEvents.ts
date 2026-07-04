import { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, OperationType, handleFirestoreError } from '../lib/firebase';
import type { CalendarEvent } from '../types';

export function useCalendarEvents(user: unknown) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;

    const pathCalendar = 'calendar_events';
    const eventsUnsubscribe = onSnapshot(collection(db, 'calendar_events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id } as CalendarEvent)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, pathCalendar));

    return () => eventsUnsubscribe();
  }, [user]);

  const saveEvent = async (eventData: Record<string, unknown>, existingFirebaseId?: string) => {
    try {
      if (existingFirebaseId) {
        await updateDoc(doc(db, 'calendar_events', existingFirebaseId), eventData);
      } else {
        await addDoc(collection(db, 'calendar_events'), eventData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'calendar_events');
    }
  };

  return { events, saveEvent };
}
