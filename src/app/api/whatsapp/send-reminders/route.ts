import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { queryConfirmedAppointments, getSalonById, updateAppointmentReminder } from '@/lib/firestore-server';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Protege el endpoint con un secreto para que solo lo llame el cron
function isAuthorized(req: NextRequest): boolean {
  // Vercel llama los crons con Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return true;

  const secret = process.env.REMINDER_CRON_SECRET;
  if (!secret) return true; // si no hay secret configurado, permite (útil en dev)
  const auth = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  return auth === secret;
}

const PROD_DOMAIN = 'https://turnos-ya-demo.vercel.app';

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = new Date();
  const nowMs = now.getTime();

  // Ventanas de tiempo para recordatorios
  const window24hStart = nowMs + 23 * 60 * 60 * 1000;  // 23hs desde ahora
  const window24hEnd   = nowMs + 25 * 60 * 60 * 1000;  // 25hs desde ahora
  const windowSameDayStart = nowMs + 1 * 60 * 60 * 1000; // 1hs desde ahora
  const windowSameDayEnd   = nowMs + 2 * 60 * 60 * 1000; // 2hs desde ahora

  // Ventana para pedido de reseña: 2hs a 3hs después del turno
  const windowReviewStart = nowMs - 3 * 60 * 60 * 1000;  // 3hs atrás
  const windowReviewEnd   = nowMs - 2 * 60 * 60 * 1000;  // 2hs atrás

  let appointments: Record<string, any>[];
  try {
    appointments = await queryConfirmedAppointments();
  } catch (e: any) {
    return NextResponse.json({ error: `Error consultando Firestore: ${e.message}` }, { status: 500 });
  }

  const salonCache: Record<string, Record<string, any> | null> = {};

  let sent24h = 0;
  let sentSameDay = 0;
  let sentReview = 0;
  let autoCompleted = 0;

  for (const apt of appointments) {
    const startTime = apt.startTime instanceof Date ? apt.startTime : new Date(apt.startTime);
    const startMs = startTime.getTime();
    if (isNaN(startMs)) continue;

    const needs24h = !apt.reminderSent24h && startMs >= window24hStart && startMs <= window24hEnd;
    const needsSameDay = !apt.reminderSentSameDay && startMs >= windowSameDayStart && startMs <= windowSameDayEnd;
    const needsReview = !apt.reviewSent && startMs >= windowReviewStart && startMs <= windowReviewEnd;

    // Auto-completar turnos pasados que siguen como confirmados
    const endTime = apt.endTime instanceof Date ? apt.endTime : (apt.endTime ? new Date(apt.endTime) : new Date(startMs + 60 * 60 * 1000));
    if (!isNaN(endTime.getTime()) && endTime < now) {
      await fetch(`https://firestore.googleapis.com/v1/projects/studio-6398913436-7a565/databases/(default)/documents/appointments/${apt.id}?updateMask.fieldPaths=status&key=AIzaSyBc1gttodLpfA3SFufoYdPQZPxx9XCCGLI`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { status: { stringValue: 'completed' } } }),
      });
      autoCompleted++;
      if (!needs24h && !needsSameDay && !needsReview) continue;
    }

    if (!needs24h && !needsSameDay && !needsReview) continue;

    const phone = apt.customerPhone;
    if (!phone) continue;

    // Fetch salon data (con cache para no repetir llamadas)
    const salonId = apt.salonId;
    if (!(salonId in salonCache)) {
      salonCache[salonId] = await getSalonById(salonId);
    }
    const salon = salonCache[salonId];

    const formattedDate = format(startTime, "eeee dd 'de' MMMM 'a las' HH:mm'hs'", { locale: es });
    const turnoLink = `${PROD_DOMAIN}/turno/${apt.id}`;
    const ubicacion = salon?.address ? `\n📍 ${salon.address}` : '';
    const alias = salon?.paymentAlias ? `\n💳 Alias de pago: ${salon.paymentAlias}` : '';

    const credentials = salon?.evolutionInstanceName
      ? { instanceName: salon.evolutionInstanceName }
      : undefined;

    if (needs24h) {
      const msg = `⏰ *Recordatorio de turno*\n\nHola ${apt.customerName}! Te recordamos que mañana tenés turno:\n\n🗓 ${formattedDate}${ubicacion}${alias}\n\nGestioná tu turno: ${turnoLink}\n\n¡Te esperamos!`;
      const ok = await sendWhatsAppMessage(phone, msg, credentials);
      if (ok) {
        await updateAppointmentReminder(apt.id, 'reminderSent24h');
        sent24h++;
      }
    }

    if (needsSameDay) {
      const msg = `🔔 *Tu turno es hoy*\n\nHola ${apt.customerName}! En pocas horas tenés turno:\n\n🗓 ${formattedDate}${ubicacion}${alias}\n\nGestioná tu turno: ${turnoLink}\n\n¡Te esperamos!`;
      const ok = await sendWhatsAppMessage(phone, msg, credentials);
      if (ok) {
        await updateAppointmentReminder(apt.id, 'reminderSentSameDay');
        sentSameDay++;
      }
    }

    if (needsReview) {
      const profileLink = `${PROD_DOMAIN}/negocio/${apt.salonId}`;
      const salonName = salon?.name || 'nosotros';
      const msg = `⭐ *¿Cómo fue tu visita?*\n\nHola ${apt.customerName}! Esperamos que hayas disfrutado tu visita a *${salonName}*.\n\nNos gustaría conocer tu opinión — dejanos tu reseña acá:\n${profileLink}\n\n¡Gracias! 🙏`;
      const ok = await sendWhatsAppMessage(phone, msg, credentials);
      if (ok) {
        await updateAppointmentReminder(apt.id, 'reviewSent');
        sentReview++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent24h,
    sentSameDay,
    sentReview,
    autoCompleted,
    checkedAt: now.toISOString(),
  });
}
