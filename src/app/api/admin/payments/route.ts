import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured, requireGlobalAdmin } from '@/lib/firebase-admin';

/**
 * Pagos de suscripciones (solo administrador).
 * ?salonId=X → historial de ese negocio. Sin parámetros → total cobrado en el mes.
 */
export async function GET(req: NextRequest) {
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });
  if (!(await requireGlobalAdmin(req.headers.get('authorization')))) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const db = adminDb();
  const salonId = req.nextUrl.searchParams.get('salonId');

  if (salonId) {
    const snap = await db.collection('subscriptionPayments').where('salonId', '==', salonId).get();
    const payments = snap.docs
      .map(d => {
        const p = d.data();
        return { id: d.id, amount: p.amount, months: p.months, plan: p.plan, paidAt: p.paidAt, periodTo: p.periodTo?.toMillis?.() ?? null };
      })
      .sort((a, b) => b.paidAt - a.paidAt);
    return NextResponse.json({ payments });
  }

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const snap = await db.collection('subscriptionPayments').where('paidAt', '>=', start.getTime()).get();
  const monthTotal = snap.docs.reduce((sum, d) => sum + (Number(d.data().amount) || 0), 0);
  return NextResponse.json({ monthTotal, monthCount: snap.size });
}
