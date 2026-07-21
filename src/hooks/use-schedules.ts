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

  // Resuelve slots para una fecha, opcionalmente con el horario de un profesional.
  // forClass usa el horario de clases del negocio en vez del horario de turnos —
  // son independientes porque una clase suele tener horarios puntuales (ej: 18hs)
  // en vez de la grilla continua de turnos 1-a-1.
  const getSlotsForDate = (
    date?: Date,
    professional?: { weekSchedule?: Record<string, { enabled: boolean; slots: string[] }> } | null,
    forClass: boolean = false,
  ): string[] => {
    if (forClass) {
      if (!date) return salon?.classTimeSlots || [];
      const dayKey = DIAS_KEY[date.getDay()];
      const classSchedule = salon?.classWeekSchedule;
      if (!classSchedule) return salon?.classTimeSlots || [];
      const dayConfig = classSchedule[dayKey];
      if (!dayConfig?.enabled) return [];
      return dayConfig.slots || [];
    }

    if (!date) return salon?.timeSlots || initialTimeSlots;

    const dayKey = DIAS_KEY[date.getDay()];

    // Si el profesional tiene horario propio, usarlo
    const profSchedule = professional?.weekSchedule;
    if (profSchedule) {
      const dayConfig = profSchedule[dayKey];
      if (!dayConfig?.enabled) return [];
      return dayConfig.slots || [];
    }

    // Fallback: horario del negocio
    const weekSchedule = salon?.weekSchedule;
    if (!weekSchedule) return salon?.timeSlots || initialTimeSlots;

    const dayConfig = weekSchedule[dayKey];
    if (!dayConfig?.enabled) return [];
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
