// Notificaciones del celu al dueño del negocio (Firebase Cloud Messaging).
// Complementan al WhatsApp: el aviso de WhatsApp sale desde el número del propio
// negocio y al dueño no le suena; la notificación sí.

import { createHash } from 'crypto';
import { getMessaging } from 'firebase-admin/messaging';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { APP_URL } from '@/lib/mercadopago';

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** "Negocio" especial para los dispositivos del administrador de Turnify. */
export const ADMIN_PUSH_TENANT = '__admin__';

// Un mismo celu puede recibir avisos de su negocio y de administrador: un registro por cada uno
export function tokenDocId(token: string, tenantId: string) {
  return createHash('sha256').update(`${tenantId}:${token}`).digest('hex');
}

export async function savePushToken(tenantId: string, uid: string, token: string, userAgent: string) {
  await adminDb().collection('pushTokens').doc(tokenDocId(token, tenantId)).set({
    tenantId, uid, token, userAgent: userAgent.slice(0, 300), updatedAt: Date.now(),
  });
}

export async function deletePushToken(token: string, tenantId: string) {
  const col = adminDb().collection('pushTokens');
  // También borra el registro con el formato anterior (sin el negocio en el id)
  const legacyId = createHash('sha256').update(token).digest('hex');
  await Promise.all([col.doc(tokenDocId(token, tenantId)).delete(), col.doc(legacyId).delete()]);
}

/**
 * Manda una notificación a todos los dispositivos donde el negocio las activó.
 * Nunca tira error: si falla, el WhatsApp igual salió.
 */
export async function notifySalon(tenantId: string, notification: { title: string; body: string; path?: string }) {
  if (!isAdminConfigured() || !tenantId) return 0;
  try {
    const db = adminDb();
    const snap = await db.collection('pushTokens').where('tenantId', '==', tenantId).get();
    if (snap.empty) return 0;

    // Un mismo dispositivo puede figurar dos veces (activaciones viejas): se le manda una sola
    const docs = snap.docs.filter((d, i, all) => all.findIndex(o => o.data().token === d.data().token) === i);
    const tokens = docs.map(d => d.data().token as string);
    const link = `${APP_URL}${notification.path || '/dashboard?tab=agenda'}`;
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: `${APP_URL}/icon-192.png`,
          badge: `${APP_URL}/icon-192.png`,
        },
        fcmOptions: { link },
        headers: { Urgency: 'high', TTL: String(24 * 60 * 60) },
      },
      data: { link },
    });

    // Los dispositivos que ya no existen (desinstaló, borró datos) se sacan de la lista
    await Promise.all(res.responses.map((r, i) =>
      !r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code) ? docs[i].ref.delete() : null
    ));
    return res.successCount;
  } catch (e) {
    console.error('[Push] Error mandando notificación:', e);
    return 0;
  }
}

/** Aviso a los dispositivos del administrador de Turnify (ej: nueva suscripción). */
export function notifyAdmins(notification: { title: string; body: string; path?: string }) {
  return notifySalon(ADMIN_PUSH_TENANT, { path: '/super-admin', ...notification });
}
