// Mensajes de WhatsApp que se mandan por un turno. El servidor arma el mensaje con los
// datos guardados del turno y solo escribe al teléfono de ese turno o al del negocio:
// nadie puede usar Turnify para mandar mensajes a otros números ni con otro texto.

import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { loadAppointmentContext, toMillis, type AppointmentContext } from '@/lib/deposit-server';
import { APP_URL } from '@/lib/mercadopago';
import { sendToProfessional } from '@/lib/staff-contacts';

const TZ = 'America/Argentina/Buenos_Aires';

/** uid del usuario que hace el pedido (ID token de Firebase en Authorization), o null. */
export async function callerUid(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    return (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

/** ¿Este usuario administra el negocio del turno (o es administrador de Turnify)? */
export async function canManageSalon(uid: string, ctx: AppointmentContext) {
  if (ctx.salon?.adminMembers?.[uid] === true) return true;
  return (await adminDb().collection('globalAdmins').doc(uid).get()).exists;
}

/** El turno recién creado puede tardar un instante en estar guardado: reintenta un poco. */
export async function loadAppointmentWithRetry(appointmentId: string, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const ctx = await loadAppointmentContext(appointmentId);
    if (ctx) return ctx;
    await new Promise(r => setTimeout(r, 800));
  }
  return null;
}

export function formatTurnoDate(ctx: AppointmentContext, pattern = "eeee dd 'de' MMMM 'a las' HH:mm'hs'") {
  const ms = toMillis(ctx.apt.startTime);
  return ms ? formatInTimeZone(new Date(ms), TZ, pattern, { locale: es }) : '';
}

export function serviceNamesOf(ctx: AppointmentContext) {
  return ctx.services.map(s => s.name).join(', ') || ctx.apt.customServiceName || '';
}

/** Confirmación al cliente de un turno sin seña (la de seña la manda el flujo de pago). */
export function buildCustomerConfirmation(ctx: AppointmentContext) {
  const { apt, salon, professional } = ctx;
  const isClass = ctx.services.length === 1 && ctx.services[0].type === 'clase';
  const address = (isClass && ctx.services[0].address) || salon?.address;
  const turnoLink = `${APP_URL}/turno/${apt.id}`;
  const cancelLine = salon?.whatsappNumber
    ? `\n\nPara ver, cancelar o reprogramar tu turno, hace clic aca:\n${turnoLink}\n\nTambien podes cancelarlo escribiendonos a este numero con al menos 12hs de anticipacion.`
    : `\n\nPara ver, cancelar o reprogramar tu turno, hace clic aca:\n${turnoLink}`;
  const aliasLine = salon?.paymentAlias ? `\n\n💳 Para abonar, usa el siguiente alias: ${salon.paymentAlias}` : '';
  const emoji = salon?.whatsappEmoji || '📋';
  return `*Turno Confirmado* ✅\n\nHola ${apt.customerName}! Tu turno esta confirmado:\n\n🗓 ${formatTurnoDate(ctx)}\n${emoji} ${serviceNamesOf(ctx)}${professional ? `\n👤 Con ${professional.name}` : ''}${address ? `\n📍 Ubicacion: ${address}` : ''}${cancelLine}${aliasLine}\n\n¡Te esperamos!`;
}

/** Aviso al negocio de un turno nuevo. */
export function buildBusinessNewBooking(ctx: AppointmentContext) {
  const { apt, professional } = ctx;
  return `📬 *Nuevo turno reservado*\n\n👤 ${apt.customerName || 'Cliente'}\n📱 ${apt.customerPhone || ''}\n🗓 ${formatTurnoDate(ctx)}\n📋 ${serviceNamesOf(ctx)}${professional ? `\n👤 Con ${professional.name}` : ''}`;
}

/** Aviso al negocio de que un cliente canceló. */
export function buildBusinessCancellation(ctx: AppointmentContext) {
  const { apt } = ctx;
  return `❌ *Turno cancelado*\n\n👤 ${apt.customerName || 'Cliente'}\n📱 ${apt.customerPhone || ''}\n🗓 ${formatTurnoDate(ctx, "dd/MM 'a las' HH:mm'hs'")}\n📋 ${serviceNamesOf(ctx)}\n\nEl cliente canceló su turno.`;
}

/** " · con Cintia" para los avisos al dueño, si el turno tiene profesional. */
export function withProfessional(ctx: AppointmentContext) {
  return ctx.professional?.name ? `con ${ctx.professional.name}` : '';
}

export function buildProfessionalCancellation(ctx: AppointmentContext) {
  const { apt } = ctx;
  return `❌ *Se canceló un turno de hoy*\n\n👤 ${apt.customerName || 'Cliente'}\n🕐 ${formatTurnoDate(ctx, "HH:mm'hs'")}\n📋 ${serviceNamesOf(ctx)}\n\nEse horario te quedó libre.`;
}

/**
 * A la persona que atiende le llega su agenda cada mañana (resumen diario).
 * Solo se le avisa aparte si se cancela un turno de ese mismo día, porque le cambia el día.
 */
export function notifyProfessionalSameDayCancellation(ctx: AppointmentContext) {
  const ms = toMillis(ctx.apt.startTime);
  if (!ms) return Promise.resolve(false);
  const today = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
  if (formatInTimeZone(new Date(ms), TZ, 'yyyy-MM-dd') !== today || ms < Date.now()) return Promise.resolve(false);
  return sendToProfessional(ctx.apt.salonId, ctx.salon, ctx.apt.professionalId, buildProfessionalCancellation(ctx));
}

/**
 * Marca un aviso como enviado una sola vez por turno. Devuelve false si ya se había mandado.
 */
export async function markOnce(ctx: AppointmentContext, field: string) {
  return adminDb().runTransaction(async tx => {
    const fresh = await tx.get(ctx.aptRef);
    if (fresh.data()?.[field]) return false;
    tx.update(ctx.aptRef, { [field]: Date.now() });
    return true;
  });
}
