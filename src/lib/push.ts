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

export function tokenDocId(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function savePushToken(tenantId: string, uid: string, token: string, userAgent: string) {
  await adminDb().collection('pushTokens').doc(tokenDocId(token)).set({
    tenantId, uid, token, userAgent: userAgent.slice(0, 300), updatedAt: Date.now(),
  });
}

export async function deletePushToken(token: string) {
  await adminDb().collection('pushTokens').doc(tokenDocId(token)).delete();
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

    const tokens = snap.docs.map(d => d.data().token as string);
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
      !r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code) ? snap.docs[i].ref.delete() : null
    ));
    return res.successCount;
  } catch (e) {
    console.error('[Push] Error mandando notificación:', e);
    return 0;
  }
}
