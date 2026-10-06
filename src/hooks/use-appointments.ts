'use client';

import { useMemoFirebase, useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Appointment } from '@/lib/data';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useEffect, useState } from 'react';

export function useAppointments(tenantId: string = 'default', opts: { publicView?: boolean } = {}) {
  const publicView = !!opts.publicView;
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const customerId = user?.uid;

  const appointmentsRef = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'appointments');
  }, [db]);

  // En la página de reservas no se leen los turnos (tienen datos de los clientes):
  // se piden al servidor solo los horarios ocupados.
  const tenantQuery = useMemoFirebase(() => {
    if (publicView || !appointmentsRef || !tenantId || !user) return null;
    return query(appointmentsRef, where('salonId', '==', tenantId));
  }, [appointmentsRef, tenantId, user, publicView]);

  const { data: rawAppointments, isLoading: isCollectionLoading } = useCollection<Appointment>(tenantQuery);
  const [publicSlots, setPublicSlots] = useState<Appointment[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    if (!publicView || !tenantId) return;
    let alive = true;
    const load = () => fetch(`/api/availability?tenantId=${encodeURIComponent(tenantId)}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { slots: [] })
      .then(d => { if (alive) setPublicSlots(d.slots || []); })
      .catch(() => { if (alive) setPublicSlots(prev => prev || []); });
    load();
    const t = setInterval(load, 20000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { alive = false; clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [publicView, tenantId, refreshKey]);
  const appointments = (publicView ? publicSlots : rawAppointments) || [];

  /**
   * Devuelve los horarios "HH:MM" ya ocupados para un profesional en una fecha dada.
   * Bloquea el slot exacto y todos los slots dentro de la duración del turno.
   * Con `duration` (minutos del turno nuevo) también bloquea los horarios donde ese turno
   * pisaría otro turno o un horario bloqueado.
   */
  const getBookedSlotsForDate = (
    professionalId: string | null,
    date: Date | undefined,
    timeSlots: string[] = [],
    blockedSlots: { date: string; time: string }[] = [],
    excludeAppointmentId?: string,
    duration = 0,
  ): string[] => {
    if (!date || !professionalId) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    const blocked = new Set<string>();

    appointments
      .filter((apt) => {
        if (!holdsSlot(apt)) return false;
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

    if (duration > 0 && timeSlots.length > 0) {
      slotsWhereItDoesNotFit(timeSlots, blocked, duration).forEach((slot) => blocked.add(slot));
    }

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
      if (!holdsSlot(apt)) return false;
      if (apt.professionalId !== professionalId) return false;
      if (!apt.serviceIds?.includes(serviceId)) return false;
      const aptDate = toDate(apt.startTime);
      if (format(aptDate, 'yyyy-MM-dd') !== dateStr) return false;
      return format(aptDate, 'HH:mm') === time;
    }).length;
  };

  const addAppointment = (
    newAppointment: Omit<Appointment, 'id' | 'customerId' | 'status' | 'salonId'>,
    onSaved?: (appointmentId: string) => void,
  ) => {
    if (!db || !user) return null;
    
    const apptDocRef = doc(collection(db, 'appointments'));
    const appointmentId = apptDocRef.id;

    const data = {
      ...newAppointment,
      id: appointmentId,
      salonId: tenantId,
      customerId: user.uid,
      status: 'confirmed',
      reminderSent24h: false,
      reminderSentSameDay: false,
      reviewSent: false,
      createdAt: serverTimestamp(),
    };

    if (onSaved) {
      setDoc(apptDocRef, data, { merge: true }).then(() => onSaved(appointmentId)).catch(() => {});
    } else {
      setDocumentNonBlocking(apptDocRef, data, { merge: true });
    }

    return appointmentId;
  };
  
  /**
   * Crea un turno que espera el pago de la seña. A diferencia de addAppointment,
   * espera a que Firestore lo guarde: el servidor lo lee enseguida para armar el pago.
   */
  const addPendingAppointment = async (
    newAppointment: Omit<Appointment, 'id' | 'customerId' | 'status' | 'salonId'>,
    expiryMinutes: number,
  ): Promise<string | null> => {
    if (!db || !user) return null;
    const apptDocRef = doc(collection(db, 'appointments'));
    await setDoc(apptDocRef, {
      ...newAppointment,
      id: apptDocRef.id,
      salonId: tenantId,
      customerId: user.uid,
      status: 'pending_payment',
      depositStatus: 'pending',
      paymentExpiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
      reminderSent24h: false,
      reminderSentSameDay: false,
      reviewSent: false,
      createdAt: serverTimestamp(),
    });
    return apptDocRef.id;
  };

  const cancelAppointment = (appointmentId: string) => {
    if (!db) return;
    const apptRef = doc(db, 'appointments', appointmentId);
    updateDocumentNonBlocking(apptRef, { 
      status: 'cancelled',
      updatedAt: serverTimestamp()
    });
  };

  const updateAppointmentStatus = (appointmentId: string, status: Appointment['status'] | 'no-show') => {
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
    if (publicView || !db || !appointments.length) return;
    const now = new Date();
    appointments.forEach(apt => {
      if (apt.status !== 'confirmed') return;
      const endTime = apt.endTime ? toDate(apt.endTime) : new Date(toDate(apt.startTime).getTime() + 60 * 60 * 1000);
      if (endTime < now) {
        const apptRef = doc(db, 'appointments', apt.id);
        updateDocumentNonBlocking(apptRef, { status: 'completed', updatedAt: serverTimestamp() });
      }
    });
  }, [appointments, db, publicView]);

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
    addPendingAppointment,
    cancelAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    getBookedSlotsForDate,
    getClassAttendeeCount,
    appointmentsThisMonth,
    loading: publicView ? publicSlots === null : (isCollectionLoading || isUserLoading),
    customerId
  };
}

const toMinutes = (slot: string) => {
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Horarios donde un turno de `duration` minutos pisaría otro turno o un horario bloqueado.
 * Los horarios del negocio son a qué hora puede empezar un turno: el último del día se puede
 * reservar aunque el servicio termine después.
 */
export function slotsWhereItDoesNotFit(timeSlots: string[], taken: Set<string>, duration: number): string[] {
  const mins = Array.from(new Set(timeSlots.map(toMinutes))).sort((a, b) => a - b);
  if (!mins.length) return [];
  const gaps = mins.slice(1).map((m, i) => m - mins[i]).filter(g => g > 0);
  const step = gaps.length ? Math.min(...gaps) : duration;
  const takenMins = new Set(Array.from(taken).map(toMinutes));
  return timeSlots.filter((slot) => {
    const start = toMinutes(slot);
    for (let t = start; t < start + duration; t += step) {
      if (takenMins.has(t)) return true;
    }
    return false;
  });
}

/** Un turno ocupa el horario si está confirmado o esperando una seña que todavía no venció. */
function holdsSlot(apt: Appointment): boolean {
  if (apt.status === 'confirmed') return true;
  if (apt.status === 'pending_payment') {
    return !!apt.paymentExpiresAt && toDate(apt.paymentExpiresAt).getTime() > Date.now();
  }
  return false;
}

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val && typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
  return new Date(val);
}
