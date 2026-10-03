import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireSalonAdmin } from '@/lib/api-auth';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { notifyAdmins } from '@/lib/push';

/**
 * Terminó la prueba (o venció el pago) y el dueño elige seguir con el plan gratis.
 * Lo hace el servidor porque el dueño no puede cambiarse el plan por las reglas.
 */
export async function POST(req: NextRequest) {
  const { tenantId } = await req.json().catch(() => ({}));
  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;

  await adminDb().collection('salons').doc(tenantId).update({
    plan: 'basic',
    subscriptionStatus: 'free',
    subscriptionExpiresAt: FieldValue.delete(),
    deposit: { ...(auth.salon.deposit || {}), enabled: false },
    updatedAt: FieldValue.serverTimestamp(),
  });

  await notifyAdmins({
    title: 'Pasó al plan gratis',
    body: `${auth.salon.name || tenantId} terminó la prueba y eligió seguir con Basic`,
  });

  return NextResponse.json({ ok: true });
}
