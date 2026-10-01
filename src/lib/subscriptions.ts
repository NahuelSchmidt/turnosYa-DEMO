// Cobro de suscripciones de los negocios: registro manual de pagos (se cobran por
// WhatsApp/transferencia) y avisos al administrador cuando vence una prueba o un pago.

import { FieldValue } from 'firebase-admin/firestore';
import { addMonths } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { adminDb } from '@/lib/firebase-admin';
import { notifyAdmins } from '@/lib/push';
import { toMillis } from '@/lib/deposit-server';

const TZ = 'America/Argentina/Buenos_Aires';
const DAY = 24 * 60 * 60 * 1000;

export const PLAN_LABELS: Record<string, string> = { basic: 'Basic', pro: 'Pro', premium: 'Premium' };

interface RecordPaymentInput {
  salonId: string;
  amount: number;
  months: number;
  plan: string;
  recordedBy: string;
}

/**
 * Anota un pago y corre el vencimiento: desde la fecha en que vencía (si todavía no
 * venció) o desde hoy (si ya venció o estaba en prueba).
 */
export async function recordPayment(input: RecordPaymentInput) {
  const db = adminDb();
  const salonRef = db.collection('salons').doc(input.salonId);

  return db.runTransaction(async tx => {
    const snap = await tx.get(salonRef);
    if (!snap.exists) throw new Error('Negocio no encontrado');
    const salon = snap.data()!;

    const now = Date.now();
    const currentExpiry = toMillis(salon.subscriptionExpiresAt);
    const wasTrial = salon.subscriptionStatus === 'trial';
    const from = !wasTrial && currentExpiry && currentExpiry > now ? currentExpiry : now;
    const to = addMonths(new Date(from), input.months);

    tx.update(salonRef, {
      plan: input.plan,
      subscriptionExpiresAt: to,
      subscriptionStatus: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection('subscriptionPayments').doc(), {
      salonId: input.salonId,
      salonName: salon.name || '',
      plan: input.plan,
      amount: input.amount,
      months: input.months,
      periodFrom: new Date(from),
      periodTo: to,
      paidAt: now,
      recordedBy: input.recordedBy,
    });
    return { expiresAt: to };
  });
}

function fmt(ms: number) {
  return formatInTimeZone(new Date(ms), TZ, "EEEE dd/MM", { locale: es });
}

/**
 * Revisa los vencimientos y avisa al administrador una sola vez por cada caso:
 * - Prueba gratis: el día anterior a que termine, y cuando terminó.
 * - Suscripción paga: 3 días antes y el día que vence.
 * Se llama desde el cron que ya corre para los recordatorios.
 */
export async function checkSubscriptionAlerts() {
  const db = adminDb();
  const now = Date.now();
  const salons = await db.collection('salons').get();
  let sent = 0;

  for (const doc of salons.docs) {
    const salon = doc.data();
    if (salon.isActive === false) continue;
    const expiry = toMillis(salon.subscriptionExpiresAt);
    if (!expiry) continue;

    const left = expiry - now;
    const trial = salon.subscriptionStatus === 'trial';
    const plan = PLAN_LABELS[salon.plan || 'basic'] || salon.plan;
    const name = salon.name || doc.id;

    let key: string | null = null;
    let title = '';
    let body = '';
    if (trial && left > 0 && left <= DAY) {
      key = 'trial-1d'; title = 'Mañana termina una prueba gratis';
      body = `${name} · ${plan} · termina el ${fmt(expiry)}`;
    } else if (trial && left <= 0 && left > -7 * DAY) {
      key = 'trial-ended'; title = 'Terminó una prueba gratis';
      body = `${name} · ${plan} · escribile para que siga`;
    } else if (!trial && left > 0 && left <= 3 * DAY) {
      key = 'paid-3d'; title = 'Suscripción por vencer';
      body = `${name} · ${plan} · vence el ${fmt(expiry)}`;
    } else if (!trial && left <= 0 && left > -7 * DAY) {
      key = 'paid-expired'; title = 'Venció una suscripción';
      body = `${name} · ${plan} · venció el ${fmt(expiry)}`;
    }
    if (!key) continue;

    // Un aviso por caso y por vencimiento: si renueva, el vencimiento cambia y vuelve a avisar
    const alertRef = db.collection('subscriptionAlerts').doc(`${doc.id}_${key}_${expiry}`);
    const first = await db.runTransaction(async tx => {
      if ((await tx.get(alertRef)).exists) return false;
      tx.set(alertRef, { salonId: doc.id, key, expiry, sentAt: now });
      return true;
    });
    if (first) {
      await notifyAdmins({ title, body });
      sent++;
    }
  }
  return sent;
}
