import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { hasSlotConflict, loadAppointmentContext, sendDepositConfirmation } from '@/lib/deposit-server';

/**
 * El dueño confirma desde su panel que le llegó la transferencia de la seña:
 * el turno pasa a confirmado y al cliente le llega el WhatsApp de confirmación.
 */
export async function POST(req: NextRequest) {
  const { tenantId, appointmentId } = await req.json().catch(() => ({}));
  if (!tenantId || !appointmentId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;

  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx || ctx.apt.salonId !== tenantId) {
    return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
  }

  const status = ctx.apt.status;
  if (status === 'confirmed' && ctx.apt.depositStatus === 'paid') return NextResponse.json({ ok: true });
  if (status !== 'pending_payment' && status !== 'expired') {
    return NextResponse.json({ error: 'Este turno ya no espera seña' }, { status: 409 });
  }
  // Si venció, solo se puede confirmar si nadie más tomó ese horario
  if (status === 'expired' && await hasSlotConflict(ctx, appointmentId)) {
    return NextResponse.json({ error: 'Ese horario ya lo reservó otra persona. Reprogramá el turno o devolvé la seña.' }, { status: 409 });
  }

  const amount = Number(ctx.apt.depositAmount) || 0;
  const applied = await adminDb().runTransaction(async tx => {
    const fresh = await tx.get(ctx.aptRef);
    if (fresh.data()?.depositStatus === 'paid') return false;
    tx.update(ctx.aptRef, {
      status: 'confirmed',
      depositStatus: 'paid',
      depositPaidAmount: amount,
      depositPaidAt: Date.now(),
      depositConfirmedBy: auth.uid,
      paymentExpiresAt: null,
      updatedAt: Date.now(),
    });
    return true;
  });

  if (applied) await sendDepositConfirmation(ctx, appointmentId, amount);
  return NextResponse.json({ ok: true });
}
