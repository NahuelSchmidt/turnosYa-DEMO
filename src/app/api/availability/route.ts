import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { toMillis } from '@/lib/deposit-server';

/**
 * Horarios ocupados de un negocio para la página de reservas. Solo devuelve lo necesario
 * para calcular la disponibilidad (profesional, servicios, horario y estado): nunca el
 * nombre ni el teléfono de los clientes.
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const since = Date.now() - 24 * 60 * 60 * 1000;
  const snap = await adminDb().collection('appointments')
    .where('salonId', '==', tenantId)
    .get();

  const slots = snap.docs
    .filter(d => ['confirmed', 'pending_payment'].includes(d.data().status))
    .map(d => {
      const a = d.data();
      return {
        id: d.id,
        salonId: tenantId,
        professionalId: a.professionalId || null,
        serviceIds: a.serviceIds || [],
        startTime: toMillis(a.startTime),
        endTime: toMillis(a.endTime),
        status: a.status,
        paymentExpiresAt: toMillis(a.paymentExpiresAt),
        ...(a.branchId ? { branchId: a.branchId } : {}),
      };
    })
    .filter(a => (a.endTime || a.startTime || 0) >= since);

  return NextResponse.json({ slots }, { headers: { 'Cache-Control': 'no-store' } });
}
