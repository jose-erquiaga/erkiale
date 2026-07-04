import React, { useState, useEffect } from 'react';
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const eventFirebaseId = e.dataTransfer.getData('text/plain');
    if (!eventFirebaseId) return;

    const oldDate = events.find(ev => ev.firebaseId === eventFirebaseId)?.date;
    setEvents(prev => prev.map(ev => ev.firebaseId === eventFirebaseId ? { ...ev, date } : ev));
    try {
      await updateDoc(doc(db, 'calendar_events', eventFirebaseId), { date });
    } catch (error) {
      if (oldDate !== undefined) {
        setEvents(prev => prev.map(ev => ev.firebaseId === eventFirebaseId ? { ...ev, date: oldDate } : ev));
      }
      handleFirestoreError(error, OperationType.UPDATE, `calendar_events/${eventFirebaseId}`);
    }
  };

  return { events, saveEvent, handleDragOver, handleDrop };
}
