import { NextRequest, NextResponse } from 'next/server';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { loadAppointmentContext, toMillis } from '@/lib/deposit-server';
import { notifySalon } from '@/lib/push';

const TZ = 'America/Argentina/Buenos_Aires';

/**
 * Avisa al negocio (notificación del celu) que entró un turno nuevo sin seña.
 * Lo llama la reserva apenas se guarda el turno; se manda una sola vez por turno.
 * Los turnos con seña avisan desde su propio flujo (pendiente o pagada).
 */
export async function POST(req: NextRequest) {
  const { appointmentId } = await req.json().catch(() => ({}));
  if (!appointmentId) return NextResponse.json({ error: 'Falta appointmentId' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ ok: false });

  const ctx = await loadAppointmentContext(String(appointmentId));
  if (!ctx || ctx.apt.status !== 'confirmed') return NextResponse.json({ ok: false });

  const first = await adminDb().runTransaction(async tx => {
    const fresh = await tx.get(ctx.aptRef);
    if (fresh.data()?.ownerNotifiedAt) return false;
    tx.update(ctx.aptRef, { ownerNotifiedAt: Date.now() });
    return true;
  });
  if (!first) return NextResponse.json({ ok: true });

  const startMs = toMillis(ctx.apt.startTime);
  const when = startMs ? formatInTimeZone(new Date(startMs), TZ, "EEEE dd/MM 'a las' HH:mm'hs'", { locale: es }) : '';
  const serviceNames = ctx.services.map(s => s.name).join(', ');

  await notifySalon(ctx.apt.salonId, {
    title: 'Nuevo turno',
    body: [ctx.apt.customerName || 'Cliente', when, serviceNames].filter(Boolean).join(' · '),
  });
  return NextResponse.json({ ok: true });
}
