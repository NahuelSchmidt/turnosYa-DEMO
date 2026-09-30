import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { processDepositPayment } from '@/lib/deposit-server';

/**
 * Aviso de Mercado Pago cuando cambia un pago. No se confía en el contenido del aviso:
 * se consulta el pago a Mercado Pago con las credenciales del negocio.
 * Siempre responde 200 para que Mercado Pago no reintente avisos que no nos sirven.
 */
export async function POST(req: NextRequest) {
  const ok = NextResponse.json({ ok: true });
  if (!isAdminConfigured()) return ok;

  const params = req.nextUrl.searchParams;
  const body = await req.json().catch(() => ({} as any));
  const tenantId = params.get('tenantId');
  const type = body?.type || body?.topic || params.get('type') || params.get('topic');
  const paymentId = String(body?.data?.id || params.get('data.id') || params.get('id') || '');
  if (type !== 'payment' || !paymentId || !tenantId) return ok;

  try {
    await processDepositPayment(tenantId, paymentId);
  } catch (e) {
    console.error('[Seña] Error procesando aviso de Mercado Pago:', e);
  }
  return ok;
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
