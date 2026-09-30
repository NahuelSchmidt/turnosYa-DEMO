// Lógica de servidor de la seña: datos del turno, total real y avisos por WhatsApp.

import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { adminDb } from '@/lib/firebase-admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { APP_URL, getAccessToken, getPayment } from '@/lib/mercadopago';

const TZ = 'America/Argentina/Buenos_Aires';

export function toMillis(value: any): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export async function loadAppointmentContext(appointmentId: string) {
  const db = adminDb();
  const aptRef = db.collection('appointments').doc(appointmentId);
  const aptSnap = await aptRef.get();
  if (!aptSnap.exists) return null;
  const apt = aptSnap.data()!;

  const salonRef = db.collection('salons').doc(apt.salonId);
  const [salonSnap, servicesSnap, profSnap] = await Promise.all([
    salonRef.get(),
    salonRef.collection('services').get(),
    apt.professionalId ? salonRef.collection('professionals').doc(apt.professionalId).get() : null,
  ]);

  const serviceIds: string[] = apt.serviceIds || [];
  const services = servicesSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(s => serviceIds.includes(s.id));

  return {
    aptRef,
    apt,
    salon: salonSnap.exists ? salonSnap.data()! : null,
    services,
    professional: profSnap?.exists ? profSnap.data()! : null,
  };
}

export type AppointmentContext = NonNullable<Awaited<ReturnType<typeof loadAppointmentContext>>>;

/** Total calculado con los precios guardados del negocio (no con lo que mandó el navegador). */
export function serviceTotal(ctx: AppointmentContext): number {
  return ctx.services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
}

/** ¿Hay otro turno activo del mismo profesional que se superpone con este? */
export async function hasSlotConflict(ctx: AppointmentContext, appointmentId: string): Promise<boolean> {
  const isClass = ctx.services.length === 1 && ctx.services[0].type === 'clase';
  if (isClass) return false;

  const start = toMillis(ctx.apt.startTime)!;
  const end = toMillis(ctx.apt.endTime) ?? start + 60 * 60 * 1000;
  const now = Date.now();

  const snap = await adminDb().collection('appointments')
    .where('salonId', '==', ctx.apt.salonId)
    .where('professionalId', '==', ctx.apt.professionalId)
    .get();

  return snap.docs.some(d => {
    if (d.id === appointmentId) return false;
    const other = d.data();
    const active = other.status === 'confirmed'
      || (other.status === 'pending_payment' && (toMillis(other.paymentExpiresAt) ?? 0) > now);
    if (!active) return false;
    const oStart = toMillis(other.startTime)!;
    const oEnd = toMillis(other.endTime) ?? oStart + 60 * 60 * 1000;
    return oStart < end && start < oEnd;
  });
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

function credentialsFor(salon: any) {
  return salon?.evolutionInstanceName ? { instanceName: salon.evolutionInstanceName } : undefined;
}

/** Confirmación al cliente y aviso al negocio cuando se acredita la seña. */
export async function sendDepositConfirmation(ctx: AppointmentContext, appointmentId: string, paidAmount: number) {
  const { apt, salon, services, professional } = ctx;
  const credentials = credentialsFor(salon);
  const startMs = toMillis(apt.startTime)!;
  const formattedDate = formatInTimeZone(new Date(startMs), TZ, "eeee dd 'de' MMMM 'a las' HH:mm'hs'", { locale: es });
  const serviceNames = services.map(s => s.name).join(', ');
  const emoji = salon?.whatsappEmoji || '📋';
  const classService = services.length === 1 && services[0].type === 'clase' ? services[0] : null;
  const address = classService?.address || salon?.address;
  const total = apt.serviceTotal ?? serviceTotal(ctx);
  const remaining = Math.max(0, total - paidAmount);
  const turnoLink = `${APP_URL}/turno/${appointmentId}`;

  const customerMsg = `*Turno Confirmado* ✅\n\nHola ${apt.customerName}! Recibimos tu seña y tu turno está confirmado:\n\n🗓 ${formattedDate}\n${emoji} ${serviceNames}${professional ? `\n👤 Con ${professional.name}` : ''}${address ? `\n📍 Ubicacion: ${address}` : ''}\n\n💳 Seña pagada: ${money(paidAmount)}${remaining > 0 ? `\nResta abonar en el local: ${money(remaining)}` : ''}\n\nPara ver tu turno, hace clic aca:\n${turnoLink}\n\n¡Te esperamos!`;

  if (apt.customerPhone) await sendWhatsAppMessage(apt.customerPhone, customerMsg, credentials);

  if (salon?.whatsappNumber && credentials) {
    const businessMsg = `📬 *Nuevo turno con seña*\n\n👤 ${apt.customerName || 'Cliente'}\n📱 ${apt.customerPhone || ''}\n🗓 ${formattedDate}\n📋 ${serviceNames}${professional ? `\n👤 Con ${professional.name}` : ''}\n💳 Seña cobrada por Mercado Pago: ${money(paidAmount)}`;
    await sendWhatsAppMessage(salon.whatsappNumber, businessMsg, credentials);
  }
}

/**
 * Seña por transferencia: al cliente le llegan el alias, el monto y el plazo;
 * al negocio, el aviso con el link a su panel para confirmar cuando le llegue la plata.
 */
export async function sendTransferInstructions(ctx: AppointmentContext, appointmentId: string, amount: number, expiresMs: number) {
  const { apt, salon, services, professional } = ctx;
  const credentials = credentialsFor(salon);
  const startMs = toMillis(apt.startTime)!;
  const formattedDate = formatInTimeZone(new Date(startMs), TZ, "eeee dd 'de' MMMM 'a las' HH:mm'hs'", { locale: es });
  const deadline = formatInTimeZone(new Date(expiresMs), TZ, "eeee dd/MM 'a las' HH:mm'hs'", { locale: es });
  const serviceNames = services.map(s => s.name).join(', ');
  const emoji = salon?.whatsappEmoji || '📋';

  const customerMsg = `*Turno reservado* 🕐\n\nHola ${apt.customerName}! Te guardamos este turno:\n\n🗓 ${formattedDate}\n${emoji} ${serviceNames}${professional ? `\n👤 Con ${professional.name}` : ''}\n\nPara confirmarlo, transferí la seña de *${money(amount)}* al alias:\n*${salon?.paymentAlias}*\n\nDespués respondé a este mensaje con el comprobante. Tenés tiempo hasta el ${deadline}; si no, el horario se libera.\n\nApenas lo confirmemos te llega el aviso por acá.`;
  if (apt.customerPhone) await sendWhatsAppMessage(apt.customerPhone, customerMsg, credentials);

  if (salon?.whatsappNumber && credentials) {
    const confirmLink = `${APP_URL}/dashboard?tab=agenda&turno=${appointmentId}`;
    const businessMsg = `🕐 *Turno esperando seña*\n\n👤 ${apt.customerName || 'Cliente'}\n📱 ${apt.customerPhone || ''}\n🗓 ${formattedDate}\n📋 ${serviceNames}${professional ? `\n👤 Con ${professional.name}` : ''}\n💳 Seña: ${money(amount)} por transferencia\n\nCuando te llegue la transferencia, confirmá el turno acá:\n${confirmLink}\n\nSi no se confirma antes del ${deadline}, el horario se libera solo.`;
    await sendWhatsAppMessage(salon.whatsappNumber, businessMsg, credentials);
  }
}

/** Aviso al negocio cuando una seña llega pero el turno ya no se puede confirmar. */
export async function notifyDepositNeedsRefund(ctx: AppointmentContext, paidAmount: number, reason: string) {
  const { apt, salon } = ctx;
  const credentials = credentialsFor(salon);
  if (!salon?.whatsappNumber || !credentials) return;
  const startMs = toMillis(apt.startTime)!;
  const formattedDate = formatInTimeZone(new Date(startMs), TZ, "eeee dd/MM 'a las' HH:mm'hs'", { locale: es });
  const msg = `⚠️ *Seña para revisar*\n\n${apt.customerName || 'Un cliente'} (${apt.customerPhone || 'sin teléfono'}) pagó ${money(paidAmount)} de seña para el ${formattedDate}, pero ${reason}.\n\nComunicate con el cliente para reprogramar o devolvele la seña desde tu cuenta de Mercado Pago.`;
  await sendWhatsAppMessage(salon.whatsappNumber, msg, credentials);
}

/**
 * Consulta un pago en Mercado Pago y, si está aprobado, confirma el turno.
 * La usan el aviso de Mercado Pago y la página de vuelta del pago; es segura de repetir.
 * Devuelve el estado del turno después de procesar.
 */
export async function processDepositPayment(tenantId: string, paymentId: string, expectedAppointmentId?: string) {
  const accessToken = await getAccessToken(tenantId);
  if (!accessToken) return null;

  const payment = await getPayment(accessToken, paymentId);
  const appointmentId = payment.external_reference;
  if (!appointmentId || (expectedAppointmentId && appointmentId !== expectedAppointmentId)) return null;

  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx || ctx.apt.salonId !== tenantId) return null;

  if (payment.status !== 'approved') {
    await ctx.aptRef.update({ depositLastStatus: payment.status, updatedAt: Date.now() });
    return ctx.apt.status as string;
  }

  const expected = Number(ctx.apt.depositAmount) || 0;
  if (payment.currency_id !== 'ARS' || payment.transaction_amount + 0.01 < expected) {
    console.error('[Seña] Monto pagado no coincide', { appointmentId, paid: payment.transaction_amount, expected });
    return ctx.apt.status as string;
  }

  // Si el turno venció o se canceló antes de que llegara el pago, no pisamos otro turno
  const status = ctx.apt.status;
  let confirm = status === 'pending_payment' || status === 'confirmed';
  let refundReason = '';
  if (status === 'cancelled') {
    confirm = false;
    refundReason = 'el cliente ya había cancelado ese turno';
  } else if (status === 'expired') {
    confirm = !(await hasSlotConflict(ctx, appointmentId));
    if (!confirm) refundReason = 'el pago llegó después del tiempo límite y ese horario ya se reservó';
  }

  // Transacción para no confirmar ni mandar el WhatsApp dos veces si llegan dos avisos juntos
  const applied = await adminDb().runTransaction(async tx => {
    const fresh = await tx.get(ctx.aptRef);
    if (fresh.data()?.depositStatus === 'paid') return false;
    tx.update(ctx.aptRef, {
      depositStatus: 'paid',
      depositPaymentId: String(payment.id),
      depositPaidAmount: payment.transaction_amount,
      depositPaidAt: Date.now(),
      depositNeedsRefund: !confirm,
      ...(confirm ? { status: 'confirmed', paymentExpiresAt: null } : {}),
      updatedAt: Date.now(),
    });
    return true;
  });

  if (applied) {
    if (confirm) await sendDepositConfirmation(ctx, appointmentId, payment.transaction_amount);
    else await notifyDepositNeedsRefund(ctx, payment.transaction_amount, refundReason);
  }
  return confirm ? 'confirmed' : (status as string);
}
