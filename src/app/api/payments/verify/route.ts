import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { processDepositPayment } from '@/lib/deposit-server';

/**
 * La página de vuelta de Mercado Pago llama acá con el payment_id para no depender
 * solo del aviso (que a veces tarda). Verifica el pago contra Mercado Pago.
 */
export async function POST(req: NextRequest) {
  const { tenantId, appointmentId, paymentId } = await req.json().catch(() => ({}));
  if (!tenantId || !appointmentId || !paymentId) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  try {
    const status = await processDepositPayment(String(tenantId), String(paymentId), String(appointmentId));
    return NextResponse.json({ status });
  } catch (e) {
    console.error('[Seña] Error verificando pago:', e);
    return NextResponse.json({ error: 'No se pudo verificar el pago' }, { status: 502 });
  }
}
