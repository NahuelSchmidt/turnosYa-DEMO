import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { queryConfirmedAppointments, getSalonById } from '@/lib/firestore-server';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.REMINDER_CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  return auth === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  const appointments = await queryConfirmedAppointments();

  // Filtrar turnos de hoy
  const todayApts = appointments.filter(apt => {
    const startTime = apt.startTime instanceof Date ? apt.startTime : new Date(apt.startTime);
    return format(startTime, 'yyyy-MM-dd') === todayStr;
  });

  if (todayApts.length === 0) {
    return NextResponse.json({ ok: true, message: 'Sin turnos hoy', sent: 0 });
  }

  // Agrupar por salón
  const bySalon: Record<string, any[]> = {};
  for (const apt of todayApts) {
    if (!bySalon[apt.salonId]) bySalon[apt.salonId] = [];
    bySalon[apt.salonId].push(apt);
  }

  const salonCache: Record<string, any> = {};
  let sent = 0;

  for (const [salonId, apts] of Object.entries(bySalon)) {
    if (!salonCache[salonId]) {
      salonCache[salonId] = await getSalonById(salonId);
    }
    const salon = salonCache[salonId];
    if (!salon?.whatsappNumber || !salon?.evolutionInstanceName) continue;

    const credentials = { instanceName: salon.evolutionInstanceName };

    // Ordenar por hora
    apts.sort((a, b) => {
      const ta = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
      const tb = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
      return ta.getTime() - tb.getTime();
    });

    const lines = apts.map(apt => {
      const startTime = apt.startTime instanceof Date ? apt.startTime : new Date(apt.startTime);
      return `• ${format(startTime, 'HH:mm')}hs — ${apt.customerName}`;
    });

    const msg = `📅 *Agenda de hoy — ${format(now, "dd 'de' MMMM", { locale: es })}*\n\nTenés ${apts.length} turno${apts.length !== 1 ? 's' : ''} hoy:\n\n${lines.join('\n')}\n\n¡Buen día! 💪`;

    const ok = await sendWhatsAppMessage(salon.whatsappNumber, msg, credentials);
    if (ok) sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
