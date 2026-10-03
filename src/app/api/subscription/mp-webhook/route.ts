import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { handleAuthorizedPayment, handlePreapproval, isSubscriptionWebhookConfigured } from '@/lib/mp-subscriptions';

export const maxDuration = 30;

/**
 * Avisos de Mercado Pago de las suscripciones a Turnify (se configura en la app de
 * Mercado Pago Developers → Webhooks → "Planes y suscripciones").
 * No se confía en lo que trae el aviso: se consulta a Mercado Pago con el id.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as any));
  const type = String(body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic') || '');
  const id = String(body.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || '');
  if (!id) return NextResponse.json({ ok: true });
  if (!isAdminConfigured() || !isSubscriptionWebhookConfigured()) {
    console.error('[Suscripción MP] Falta configurar FIREBASE_SERVICE_ACCOUNT o MP_ACCESS_TOKEN');
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }

  try {
    if (type.includes('authorized_payment')) {
      const r = await handleAuthorizedPayment(id);
      return NextResponse.json({ ok: true, ...r });
    }
    if (type.includes('preapproval') && !type.includes('plan')) {
      const r = await handlePreapproval(id);
      return NextResponse.json({ ok: true, ...r });
    }
    return NextResponse.json({ ok: true, ignored: type });
  } catch (e: any) {
    console.error('[Suscripción MP] Error:', type, id, e?.message);
    // 500 para que Mercado Pago reintente más tarde
    return NextResponse.json({ error: 'retry' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
