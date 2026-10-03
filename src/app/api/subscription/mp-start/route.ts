import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';

/**
 * El dueño tocó "Pagar con Mercado Pago": se anota para reconocer su suscripción cuando
 * Mercado Pago avise (el link de suscripción es el mismo para todos los negocios).
 */
export async function POST(req: NextRequest) {
  const { tenantId, plan } = await req.json().catch(() => ({}));
  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });
  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;

  await adminDb().collection('salons').doc(tenantId).update({
    mpCheckout: { plan: plan === 'premium' ? 'premium' : 'pro', startedAt: Date.now() },
  });
  return NextResponse.json({ ok: true });
}
