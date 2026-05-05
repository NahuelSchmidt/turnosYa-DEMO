
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

  // Priorizamos los datos de Firestore, si no hay nada usamos los iniciales
  const timeSlots = salon?.timeSlots || initialTimeSlots;

  const updateTimeSlots = (updatedTimeSlots: string[]) => {
    if (!db || !tenantId || tenantId === 'default') return;
    
    // Ordenamos los horarios para que siempre se vean bien
    const sorted = [...updatedTimeSlots].sort((a, b) => a.localeCompare(b));
    
    const sRef = doc(db, 'salons', tenantId);
    
    // Usamos merge: true para no borrar otros campos del salón como el nombre o color
    setDocumentNonBlocking(sRef, { 
      timeSlots: sorted,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  return { timeSlots, loading: isLoading, updateTimeSlots };
}
