'use client';

import { useMemoFirebase, useDoc, useFirestore } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { initialTimeSlots } from '@/lib/data';

const DIAS_KEY = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']; // getDay() → 0=dom

export function useSchedules(tenantId: string = 'default') {
  const db = useFirestore();

  const salonRef = useMemoFirebase(() => {
    if (!db || !tenantId || tenantId === 'default') return null;
    return doc(db, 'salons', tenantId);
  }, [db, tenantId]);

  const { data: salon, isLoading } = useDoc<any>(salonRef);

  // Si hay weekSchedule configurado, devuelve los slots del día indicado
  const getSlotsForDate = (date?: Date): string[] => {
    if (!date) return salon?.timeSlots || initialTimeSlots;

    const weekSchedule = salon?.weekSchedule;
    if (!weekSchedule) return salon?.timeSlots || initialTimeSlots;

    const dayKey = DIAS_KEY[date.getDay()];
    const dayConfig = weekSchedule[dayKey];

    if (!dayConfig?.enabled) return []; // día desactivado = sin turnos
    return dayConfig.slots || [];
  };

  // Para compatibilidad con código existente (devuelve todos los slots únicos)
  const timeSlots = salon?.timeSlots || initialTimeSlots;

  const updateTimeSlots = (updatedTimeSlots: string[]) => {
    if (!db || !tenantId || tenantId === 'default') return;
    const sorted = [...updatedTimeSlots].sort((a, b) => a.localeCompare(b));
    const sRef = doc(db, 'salons', tenantId);
    setDocumentNonBlocking(sRef, { timeSlots: sorted, updatedAt: serverTimestamp() }, { merge: true });
  };

  return { timeSlots, getSlotsForDate, loading: isLoading, updateTimeSlots };
}
