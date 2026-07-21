'use client';

import { useMemoFirebase, useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Appointment } from '@/lib/data';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useEffect } from 'react';

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
   * Bloquea el slot exacto y todos los slots dentro de la duración del turno.
   */
  const getBookedSlotsForDate = (
    professionalId: string | null,
    date: Date | undefined,
    timeSlots: string[] = [],
    blockedSlots: { date: string; time: string }[] = [],
    excludeAppointmentId?: string,
  ): string[] => {
    if (!date || !professionalId) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    const blocked = new Set<string>();

    appointments
      .filter((apt) => {
        if (apt.status !== 'confirmed') return false;
        if (apt.professionalId !== professionalId) return false;
        if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
        const aptDate = toDate(apt.startTime);
        return format(aptDate, 'yyyy-MM-dd') === dateStr;
      })
      .forEach((apt) => {
        const startMs = toDate(apt.startTime).getTime();
        const endMs = toDate(apt.endTime).getTime();

        if (timeSlots.length === 0) {
          blocked.add(format(toDate(apt.startTime), 'HH:mm'));
        } else {
          timeSlots.forEach((slot) => {
            const [h, m] = slot.split(':').map(Number);
            const slotDate = new Date(toDate(apt.startTime));
            slotDate.setHours(h, m, 0, 0);
            const slotMs = slotDate.getTime();
            if (slotMs >= startMs && slotMs < endMs) {
              blocked.add(slot);
            }
          });
        }
      });

    blockedSlots
      .filter((bs) => bs.date === dateStr)
      .forEach((bs) => blocked.add(bs.time));

    return Array.from(blocked);
  };

  /**
   * Cuenta cuántos clientes ya están anotados en un servicio tipo "clase"
   * para un profesional, fecha y horario específicos. Usado para el cupo
   * de clases grupales, en vez del bloqueo binario de getBookedSlotsForDate.
   */
  const getClassAttendeeCount = (
    serviceId: string,
    professionalId: string | null,
    date: Date | undefined,
    time: string,
  ): number => {
    if (!date || !professionalId || !time) return 0;
    const dateStr = format(date, 'yyyy-MM-dd');

    return appointments.filter((apt) => {
      if (apt.status !== 'confirmed') return false;
      if (apt.professionalId !== professionalId) return false;
      if (!apt.serviceIds?.includes(serviceId)) return false;
      const aptDate = toDate(apt.startTime);
      if (format(aptDate, 'yyyy-MM-dd') !== dateStr) return false;
      return format(aptDate, 'HH:mm') === time;
    }).length;
  };

  const addAppointment = (newAppointment: Omit<Appointment, 'id' | 'customerId' | 'status' | 'salonId'>) => {
    if (!db || !user) return null;
    
    const apptDocRef = doc(collection(db, 'appointments'));
    const appointmentId = apptDocRef.id;

    setDocumentNonBlocking(apptDocRef, {
      ...newAppointment,
      id: appointmentId,
      salonId: tenantId,
      customerId: user.uid,
      status: 'confirmed',
      reminderSent24h: false,
      reminderSentSameDay: false,
      reviewSent: false,
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

  const updateAppointmentStatus = (appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled' | 'no-show') => {
    if (!db) return;
    const apptRef = doc(db, 'appointments', appointmentId);
    updateDocumentNonBlocking(apptRef, { status, updatedAt: serverTimestamp() });
  };

  const rescheduleAppointment = (appointmentId: string, newStartTime: Date, newEndTime: Date) => {
    if (!db) return;
    const apptRef = doc(db, 'appointments', appointmentId);
    updateDocumentNonBlocking(apptRef, { startTime: newStartTime, endTime: newEndTime, updatedAt: serverTimestamp() });
  };

  // Auto-completar turnos confirmados cuyo endTime ya pasó
  useEffect(() => {
    if (!db || !appointments.length) return;
    const now = new Date();
    appointments.forEach(apt => {
      if (apt.status !== 'confirmed') return;
      const endTime = apt.endTime ? toDate(apt.endTime) : new Date(toDate(apt.startTime).getTime() + 60 * 60 * 1000);
      if (endTime < now) {
        const apptRef = doc(db, 'appointments', apt.id);
        updateDocumentNonBlocking(apptRef, { status: 'completed', updatedAt: serverTimestamp() });
      }
    });
  }, [appointments, db]);

  const appointmentsThisMonth = (() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return appointments.filter(a => {
      if (a.status !== 'confirmed') return false;
      const d = toDate(a.startTime);
      return d >= start && d <= end;
    }).length;
  })();

  return {
    appointments,
    addAppointment,
    cancelAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    getBookedSlotsForDate,
    getClassAttendeeCount,
    appointmentsThisMonth,
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
