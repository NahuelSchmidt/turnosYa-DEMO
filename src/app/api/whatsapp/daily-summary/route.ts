import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { queryConfirmedAppointments, getSalonById } from '@/lib/firestore-server';
import { isCronAuthorized } from '@/lib/cron-auth';
import { adminDb } from '@/lib/firebase-admin';
import { cleanPhone, getStaffPhones } from '@/lib/staff-contacts';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const TZ = 'America/Argentina/Buenos_Aires';

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = new Date();
  const todayStr = formatInTimeZone(now, TZ, 'yyyy-MM-dd');

  const appointments = await queryConfirmedAppointments();

  // Filtrar turnos de hoy (en timezone Argentina)
  const todayApts = appointments.filter(apt => {
    const startTime = apt.startTime instanceof Date ? apt.startTime : new Date(apt.startTime);
    return formatInTimeZone(startTime, TZ, 'yyyy-MM-dd') === todayStr;
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
    if (!salon?.evolutionInstanceName) continue;
    const credentials = { instanceName: salon.evolutionInstanceName };

    apts.sort((a, b) => toDate(a.startTime).getTime() - toDate(b.startTime).getTime());
    const [services, professionals] = await Promise.all([
      adminDb().collection('salons').doc(salonId).collection('services').get(),
      adminDb().collection('salons').doc(salonId).collection('professionals').get(),
    ]);
    const serviceName = new Map(services.docs.map(d => [d.id, String(d.data().name || '')]));
    const profName = new Map(professionals.docs.map(d => [d.id, String(d.data().name || '')]));
    const servicesOf = (apt: any) => (apt.serviceIds || []).map((id: string) => serviceName.get(id)).filter(Boolean).join(', ') || apt.customServiceName || '';
    const dateLabel = formatInTimeZone(now, TZ, "dd 'de' MMMM", { locale: es });

    // Al negocio: todos los turnos del día, con quién es cada uno
    if (salon.whatsappNumber && await firstTime(`daily_${salonId}_${todayStr}`)) {
      const withPros = profName.size > 1;
      const lines = apts.map(apt => {
        const pro = withPros && profName.get(apt.professionalId) ? ` · ${profName.get(apt.professionalId)}` : '';
        return `• ${formatInTimeZone(toDate(apt.startTime), TZ, 'HH:mm')}hs — ${apt.customerName}${pro}`;
      });
      const msg = `📅 *Agenda de hoy — ${dateLabel}*\n\nTenés ${apts.length} turno${apts.length !== 1 ? 's' : ''} hoy:\n\n${lines.join('\n')}\n\n¡Buen día! 💪`;
      if (await sendWhatsAppMessage(salon.whatsappNumber, msg, credentials)) sent++;
    }

    // A cada persona del equipo que tenga WhatsApp cargado: solo sus turnos
    const phones = await getStaffPhones(salonId).catch(() => ({} as Record<string, string>));
    const byPro: Record<string, any[]> = {};
    for (const apt of apts) if (apt.professionalId) (byPro[apt.professionalId] ||= []).push(apt);
    for (const [proId, proApts] of Object.entries(byPro)) {
      const phone = phones[proId];
      if (!phone || phone === cleanPhone(salon.whatsappNumber)) continue;
      if (!(await firstTime(`daily_${salonId}_${proId}_${todayStr}`))) continue;
      const lines = proApts.map(apt => {
        const svc = servicesOf(apt);
        return `• ${formatInTimeZone(toDate(apt.startTime), TZ, 'HH:mm')}hs — ${apt.customerName}${svc ? ` (${svc})` : ''}`;
      });
      const name = (profName.get(proId) || '').split(' ')[0];
      const msg = `📅 *Tus turnos de hoy — ${dateLabel}*\n\nHola${name ? ` ${name}` : ''}! Hoy tenés ${proApts.length} turno${proApts.length !== 1 ? 's' : ''}:\n\n${lines.join('\n')}\n\n¡Buen día! 💪`;
      if (await sendWhatsAppMessage(phone, msg, credentials)) sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}

function toDate(v: any): Date {
  return v instanceof Date ? v : new Date(v);
}

/** Un solo aviso por día aunque el cron se llame varias veces. */
async function firstTime(id: string) {
  try {
    await adminDb().collection('cronRuns').doc(id).create({ sentAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}
