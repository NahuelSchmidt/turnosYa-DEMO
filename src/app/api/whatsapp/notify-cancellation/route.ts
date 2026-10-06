import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { notifySalon } from '@/lib/push';
import { buildBusinessCancellation, buildProfessionalCancellation, formatTurnoDate, loadAppointmentWithRetry, markOnce, notifyProfessional, withProfessional } from '@/lib/wa-notify';

/**
 * El cliente canceló su turno: avisa al negocio (celu y WhatsApp) una sola vez.
 * Solo funciona si el turno está de verdad cancelado; el texto lo arma el servidor.
 */
export async function POST(req: NextRequest) {
  try {
    const { appointmentId } = await req.json().catch(() => ({}));
    if (!appointmentId) return NextResponse.json({ error: 'Falta appointmentId' }, { status: 400 });
    if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

    // La cancelación la guarda el navegador: le damos unos segundos para que llegue
    let ctx = null;
    for (let i = 0; i < 5; i++) {
      ctx = await loadAppointmentWithRetry(String(appointmentId), 1);
      if (ctx?.apt.status === 'cancelled') break;
      await new Promise(r => setTimeout(r, 1000));
    }
    if (!ctx || ctx.apt.status !== 'cancelled') return NextResponse.json({ sent: false });
    if (!(await markOnce(ctx, 'cancellationNotifiedAt'))) return NextResponse.json({ sent: false, already: true });

    await notifySalon(ctx.apt.salonId, {
      title: 'Turno cancelado',
      body: [ctx.apt.customerName || 'Un cliente', formatTurnoDate(ctx, "dd/MM 'a las' HH:mm'hs'"), withProfessional(ctx), 'canceló su turno'].filter(Boolean).join(' · '),
    });
    await notifyProfessional(ctx, buildProfessionalCancellation(ctx));

    const salon = ctx.salon;
    if (!salon?.whatsappNumber || !salon?.evolutionInstanceName) return NextResponse.json({ sent: false });
    const sent = await sendWhatsAppMessage(salon.whatsappNumber, buildBusinessCancellation(ctx), { instanceName: salon.evolutionInstanceName });
    return NextResponse.json({ sent });
  } catch (e: any) {
    console.error('[WhatsApp] notify-cancellation:', e?.message);
    return NextResponse.json({ error: 'No se pudo avisar' }, { status: 500 });
  }
}
