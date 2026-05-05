'use client';

import { useMemoFirebase, useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Appointment } from '@/lib/data';
import { format } from 'date-fns';

export function useAppointments(tenantId: string = 'default') {
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const customerId = user?.uid;

  const appointmentsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'appointments');
  }, [db]);

  const tenantQuery = useMemoFirebase(() => {
    if (!appointmentsRef || !tenantId || !user) return null;
    return query(appointmentsRef, where('salonId', '==', tenantId));
  }, [appointmentsRef, tenantId, user]);

  const { data: rawAppointments, isLoading: isCollectionLoading } = useCollection<Appointment>(tenantQuery);
  const appointments = rawAppointments || [];

  /**
   * Devuelve los horarios "HH:MM" ya ocupados para un profesional en una fecha dada.
   * Sólo cuenta los turnos con status 'confirmed'.
   */
  const getBookedSlotsForDate = (professionalId: string | null, date: Date | undefined): string[] => {
    if (!date || !professionalId) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments
      .filter((apt) => {
        if (apt.status !== 'confirmed') return false;
        if (apt.professionalId !== professionalId) return false;
        const aptDate = toDate(apt.startTime);
        return format(aptDate, 'yyyy-MM-dd') === dateStr;
      })
      .map((apt) => format(toDate(apt.startTime), 'HH:mm'));
  };

  const addAppointment = (newAppointment: Omit<Appointment, 'id' | 'customerId' | 'status'>) => {
    if (!db || !user) return null;
    
    const apptDocRef = doc(collection(db, 'appointments'));
    const appointmentId = apptDocRef.id;

    setDocumentNonBlocking(apptDocRef, {
      ...newAppointment,
      id: appointmentId,
      salonId: tenantId,
      customerId: user.uid,
      status: 'confirmed',
      createdAt: serverTimestamp(),
    }, { merge: true });

    return appointmentId;
  };
  
  const cancelAppointment = (appointmentId: string) => {
    if (!db) return;
    const apptRef = doc(db, 'appointments', appointmentId);
    updateDocumentNonBlocking(apptRef, { 
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });
  };

  return { 
    appointments, 
    addAppointment, 
    cancelAppointment, 
    getBookedSlotsForDate,
    loading: isCollectionLoading || isUserLoading, 
    customerId 
  };
}

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val && typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
  return new Date(val);
}
