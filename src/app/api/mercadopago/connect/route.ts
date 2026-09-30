import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireSalonAdmin } from '@/lib/api-auth';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { getAuthorizationUrl, isMercadoPagoConfigured } from '@/lib/mercadopago';
import { PLAN_FEATURES, PlanType } from '@/lib/data';

/**
 * Devuelve el link para que el dueño del negocio autorice a Turnify a cobrar
 * señas en su cuenta de Mercado Pago. Mercado Pago lo devuelve a /callback.
 */
export async function POST(req: NextRequest) {
  const { tenantId } = await req.json().catch(() => ({}));
  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });

  if (!isMercadoPagoConfigured() || !isAdminConfigured()) {
    return NextResponse.json({ error: 'Mercado Pago no está configurado en el servidor' }, { status: 500 });
  }

  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;

  const plan = (auth.salon.plan as PlanType) || 'basic';
  if (!PLAN_FEATURES[plan]?.hasDeposits) {
    return NextResponse.json({ error: 'La seña está disponible desde el plan Pro' }, { status: 403 });
  }

  const state = randomUUID();
  await adminDb().collection('mpOAuthStates').doc(state).set({
    tenantId,
    uid: auth.uid,
    createdAt: Date.now(),
  });

  return NextResponse.json({ url: getAuthorizationUrl(state) });
}
