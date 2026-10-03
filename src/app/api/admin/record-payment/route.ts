import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured, requireGlobalAdmin } from '@/lib/firebase-admin';
import { recordPayment } from '@/lib/subscriptions';

/** El administrador anota que un negocio le pagó: corre el vencimiento y guarda el pago. */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });
  const adminUid = await requireGlobalAdmin(req.headers.get('authorization'));
  if (!adminUid) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const salonId = String(body.salonId || '');
  const amount = Math.max(0, Number(body.amount) || 0);
  const months = [1, 3, 6, 12].includes(Number(body.months)) ? Number(body.months) : 1;
  const plan = ['basic', 'pro', 'premium'].includes(body.plan) ? body.plan : 'pro';
  if (!salonId) return NextResponse.json({ error: 'Falta el negocio' }, { status: 400 });

  try {
    const method = body.method === 'mercadopago' ? 'mercadopago' : 'transfer';
    const { expiresAt } = await recordPayment({ salonId, amount, months, plan, method, recordedBy: adminUid });
    return NextResponse.json({ expiresAt: expiresAt?.toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo registrar el pago' }, { status: 400 });
  }
}
