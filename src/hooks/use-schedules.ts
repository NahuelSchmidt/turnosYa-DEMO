'use client';

import { useMemoFirebase, useDoc, useFirestore } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { initialTimeSlots } from '@/lib/data';

export function useSchedules(tenantId: string = 'default') {
  const db = useFirestore();

  const salonRef = useMemoFirebase(() => {
    if (!db || !tenantId || tenantId === 'default') return null;
    return doc(db, 'salons', tenantId);
  }, [db, tenantId]);

  const { data: salon, isLoading } = useDoc<any>(salonRef);

  const timeSlots = salon?.timeSlots || initialTimeSlots;

  const updateTimeSlots = (updatedTimeSlots: string[]) => {
    if (!db || !tenantId || tenantId === 'default') return;
    const sorted = [...updatedTimeSlots].sort((a, b) => a.localeCompare(b));
    const sRef = doc(db, 'salons', tenantId);
    setDocumentNonBlocking(sRef, { timeSlots: sorted, updatedAt: serverTimestamp() }, { merge: true });
  };

  return { timeSlots, loading: isLoading, updateTimeSlots };
}
