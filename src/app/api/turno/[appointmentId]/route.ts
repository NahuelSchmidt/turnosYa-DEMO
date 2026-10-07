import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { loadAppointmentContext, toMillis } from '@/lib/deposit-server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { notifySalon } from '@/lib/push';
import { buildBusinessCancellation, formatTurnoDate, markOnce, notifyProfessionalSameDayCancellation, withProfessional } from '@/lib/wa-notify';

/** Con al menos estas horas de anticipación el cliente puede cancelar solo. */
const MIN_HOURS_TO_CANCEL = 12;

type Params = { params: Promise<{ appointmentId: string }> };

/**
 * Página "Mi turno" (el link que le llega al cliente por WhatsApp). El id del turno es
 * largo y aleatorio, y funciona como llave: devuelve solo lo que muestra esa página.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { appointmentId } = await params;
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });
  const snap = await adminDb().collection('appointments').doc(appointmentId).get();
  if (!snap.exists) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
  const a = snap.data()!;

  // Cupo de la clase: cuántos anotados hay en ese mismo horario
  let classCount = 0;
  if (a.professionalId && (a.serviceIds || []).length === 1) {
    const same = await adminDb().collection('appointments')
      .where('salonId', '==', a.salonId)
      .where('professionalId', '==', a.professionalId)
      .where('startTime', '==', a.startTime)
      .get();
    classCount = same.docs.filter(d => d.data().status === 'confirmed' && (d.data().serviceIds || []).includes(a.serviceIds[0])).length;
  }

  return NextResponse.json({
    apt: {
      id: snap.id,
      salonId: a.salonId,
      professionalId: a.professionalId || null,
      serviceIds: a.serviceIds || [],
      startTime: toMillis(a.startTime),
      endTime: toMillis(a.endTime),
      status: a.status,
      customerName: a.customerName || '',
      total: a.total || 0,
      depositStatus: a.depositStatus || 'none',
    },
    classCount,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

/** El cliente cancela su turno desde el link: lo hace el servidor y avisa al negocio. */
export async function POST(req: NextRequest, { params }: Params) {
  const { appointmentId } = await params;
  const { action } = await req.json().catch(() => ({}));
  if (action !== 'cancel') return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
  const { apt } = ctx;
  if (apt.status === 'cancelled') return NextResponse.json({ ok: true });
  if (apt.status !== 'confirmed') return NextResponse.json({ error: 'Este turno ya no se puede cancelar' }, { status: 409 });
  if (apt.depositStatus === 'paid') {
    return NextResponse.json({ error: 'Este turno tiene seña: escribile al negocio para cancelarlo' }, { status: 409 });
  }
  const startMs = toMillis(apt.startTime) || 0;
  if (startMs - Date.now() < MIN_HOURS_TO_CANCEL * 60 * 60 * 1000) {
    return NextResponse.json({ error: `Solo se puede cancelar con ${MIN_HOURS_TO_CANCEL}hs de anticipación` }, { status: 409 });
  }

  await ctx.aptRef.update({ status: 'cancelled', cancelledBy: 'customer', cancelledAt: Date.now() });

  if (await markOnce(ctx, 'cancellationNotifiedAt')) {
    await notifySalon(apt.salonId, {
      title: 'Turno cancelado',
      body: [apt.customerName || 'Un cliente', formatTurnoDate(ctx, "dd/MM 'a las' HH:mm'hs'"), withProfessional(ctx), 'canceló su turno'].filter(Boolean).join(' · '),
    });
    const salon = ctx.salon;
    if (salon?.whatsappNumber && salon?.evolutionInstanceName) {
      await sendWhatsAppMessage(salon.whatsappNumber, buildBusinessCancellation(ctx), { instanceName: salon.evolutionInstanceName });
    }
    await notifyProfessionalSameDayCancellation(ctx);
  }
  return NextResponse.json({ ok: true });
}
