// Suscripciones de Turnify cobradas con Mercado Pago (Planes de suscripción).
// Mercado Pago avisa por webhook cuando alguien se suscribe y cada vez que se cobra un mes;
// acá se identifica el negocio y se le activa o renueva el plan solo.
//
// Variables de entorno:
//   MP_ACCESS_TOKEN → Access Token de producción de la cuenta de Mercado Pago de Turnify
//                     (la dueña de los planes), para consultar las suscripciones y sus pagos.

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { notifyAdmins } from '@/lib/push';
import { recordPayment, PLAN_LABELS } from '@/lib/subscriptions';
import { SUBSCRIPTION_PRICES, money } from '@/lib/pricing';
import { toMillis } from '@/lib/deposit-server';

const MP_API = 'https://api.mercadopago.com';
const DAY = 24 * 60 * 60 * 1000;
/** Mientras llega el primer cobro, la cuenta queda activa unos días. */
const PROVISIONAL_DAYS = 3;
/** Cuánto vale la marca de "está pagando con Mercado Pago" para identificar al que pagó. */
const CHECKOUT_WINDOW_MS = 6 * 60 * 60 * 1000;

export function isSubscriptionWebhookConfigured() {
  return !!process.env.MP_ACCESS_TOKEN;
}

async function mpGet(path: string) {
  const res = await fetch(`${MP_API}${path}`, { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Mercado Pago ${path} → ${res.status}`);
  return res.json();
}

/** Pro o Premium según el monto del plan. */
function planFromAmount(amount: number): 'pro' | 'premium' {
  return amount >= (SUBSCRIPTION_PRICES.pro.mercadopago + SUBSCRIPTION_PRICES.premium.mercadopago) / 2 ? 'premium' : 'pro';
}

/**
 * Busca el negocio de una suscripción: primero por la suscripción ya vinculada, después por la
 * referencia, el mail del dueño, y por último el único negocio que tocó "Pagar con Mercado Pago"
 * hace poco con ese plan.
 */
async function findSalon(preapproval: any, plan: string) {
  const db = adminDb();
  const byId = await db.collection('salons').where('mpPreapprovalId', '==', String(preapproval.id)).limit(1).get();
  if (!byId.empty) return byId.docs[0];

  const ref = String(preapproval.external_reference || '').trim();
  if (ref) {
    const doc = await db.collection('salons').doc(ref).get();
    if (doc.exists) return doc;
  }

  const email = String(preapproval.payer_email || '').trim().toLowerCase();
  if (email) {
    const byEmail = await db.collection('salons').where('email', '==', email).limit(2).get();
    if (byEmail.size === 1) return byEmail.docs[0];
  }

  const since = Date.now() - CHECKOUT_WINDOW_MS;
  const recent = await db.collection('salons').where('mpCheckout.startedAt', '>=', since).get();
  const candidates = recent.docs.filter(d => d.data().mpCheckout?.plan === plan && !d.data().mpPreapprovalId);
  if (candidates.length === 1) return candidates[0];
  return null;
}

/** Aviso al administrador una sola vez por clave. */
async function notifyOnce(key: string, notification: { title: string; body: string }) {
  const ref = adminDb().collection('subscriptionAlerts').doc(`mp_${key}`);
  const first = await adminDb().runTransaction(async tx => {
    if ((await tx.get(ref)).exists) return false;
    tx.set(ref, { key, sentAt: Date.now() });
    return true;
  });
  if (first) await notifyAdmins({ ...notification, path: '/super-admin' });
}

/** Se suscribió, pausó o canceló: se vincula al negocio y, si autorizó, se le libera la cuenta. */
export async function handlePreapproval(preapprovalId: string) {
  const pre = await mpGet(`/preapproval/${encodeURIComponent(preapprovalId)}`);
  const amount = Number(pre.auto_recurring?.transaction_amount) || 0;
  const plan = planFromAmount(amount);
  const salonDoc = await findSalon(pre, plan);

  if (!salonDoc) {
    await notifyOnce(`unmatched_${pre.id}`, {
      title: 'Suscripción sin identificar',
      body: `Alguien se suscribió al ${PLAN_LABELS[plan]} (${money(amount)}) con ${pre.payer_email || 'un mail desconocido'}. Registrá el pago a mano en el negocio que corresponda.`,
    });
    return { matched: false };
  }

  const salon = salonDoc.data()!;
  const updates: Record<string, any> = {
    mpPreapprovalId: String(pre.id),
    mpSubscriptionStatus: pre.status,
    mpPayerEmail: pre.payer_email || null,
    mpCheckout: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (pre.status === 'authorized') {
    // Se libera ya, sin esperar el primer cobro (que llega aparte en unos minutos)
    const now = Date.now();
    const expiry = toMillis(salon.subscriptionExpiresAt) || 0;
    const usable = salon.subscriptionStatus === 'active' && expiry > now;
    if (!usable) {
      Object.assign(updates, {
        plan,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: new Date(now + PROVISIONAL_DAYS * DAY),
        mpPendingFirstPayment: true,
      });
    }
  } else if (pre.status === 'cancelled' || pre.status === 'paused') {
    await notifyOnce(`${pre.status}_${pre.id}`, {
      title: pre.status === 'cancelled' ? 'Canceló la suscripción' : 'Pausó la suscripción',
      body: `${salon.name || salonDoc.id} · ${PLAN_LABELS[plan]} · sigue activo hasta que venza lo que ya pagó`,
    });
  }

  await salonDoc.ref.update(updates);
  return { matched: true, salonId: salonDoc.id, status: pre.status };
}

/** Se cobró un mes de la suscripción: se registra el pago y se corre el vencimiento. */
export async function handleAuthorizedPayment(authorizedPaymentId: string) {
  const ap = await mpGet(`/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`);
  const paymentStatus = ap.payment?.status || ap.status;
  if (paymentStatus !== 'approved') return { recorded: false, status: paymentStatus };

  // Vincula el negocio si el aviso del pago llegó antes que el de la suscripción
  const link = await handlePreapproval(String(ap.preapproval_id));
  if (!link.matched || !link.salonId) return { recorded: false, status: 'unmatched' };

  const db = adminDb();
  const salonRef = db.collection('salons').doc(link.salonId);
  const salon = (await salonRef.get()).data() || {};
  const amount = Number(ap.transaction_amount) || 0;
  const plan = planFromAmount(amount);

  const result = await recordPayment({
    salonId: link.salonId,
    amount,
    months: 1,
    plan,
    method: 'mercadopago',
    recordedBy: 'mercadopago',
    paymentDocId: `mp_${ap.payment?.id || ap.id}`,
    fromNow: !!salon.mpPendingFirstPayment,
    extra: { mpPendingFirstPayment: FieldValue.delete() },
  });
  if (result.duplicate) return { recorded: false, status: 'duplicate' };

  await notifyAdmins(result.firstPayment
    ? { title: 'Nueva suscripción 🎉', body: `${salon.name || link.salonId} · ${PLAN_LABELS[plan]} · ${money(amount)} por Mercado Pago`, path: '/super-admin' }
    : { title: 'Renovación', body: `${salon.name || link.salonId} pagó otro mes · ${PLAN_LABELS[plan]} · ${money(amount)}`, path: '/super-admin' });
  return { recorded: true };
}
