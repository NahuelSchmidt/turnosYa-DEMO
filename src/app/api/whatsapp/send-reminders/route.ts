import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { queryConfirmedAppointments, getSalonById, updateAppointmentReminder } from '@/lib/firestore-server';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Protege el endpoint con un secreto para que solo lo llame el cron
function isAuthorized(req: NextRequest): boolean {
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
  const windowSameDayStart = nowMs + 1.5 * 60 * 60 * 1000; // 1.5hs desde ahora
  const windowSameDayEnd   = nowMs + 3 * 60 * 60 * 1000;   // 3hs desde ahora

  let appointments: Record<string, any>[];
  try {
    appointments = await queryConfirmedAppointments();
  } catch (e: any) {
    return NextResponse.json({ error: `Error consultando Firestore: ${e.message}` }, { status: 500 });
  }

  const salonCache: Record<string, Record<string, any> | null> = {};

  let sent24h = 0;
  let sentSameDay = 0;

  for (const apt of appointments) {
    const startTime = apt.startTime instanceof Date ? apt.startTime : new Date(apt.startTime);
    const startMs = startTime.getTime();
    if (isNaN(startMs)) continue;

    const needs24h = !apt.reminderSent24h && startMs >= window24hStart && startMs <= window24hEnd;
    const needsSameDay = !apt.reminderSentSameDay && startMs >= windowSameDayStart && startMs <= windowSameDayEnd;

    if (!needs24h && !needsSameDay) continue;

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
  }

  return NextResponse.json({
    ok: true,
    sent24h,
    sentSameDay,
    checkedAt: now.toISOString(),
  });
}
