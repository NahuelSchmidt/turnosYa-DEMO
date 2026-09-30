import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';
import { computeDepositAmount, getDepositConfig, isDepositActive } from '@/lib/deposit';
import { loadAppointmentContext, sendTransferInstructions, serviceTotal, toMillis } from '@/lib/deposit-server';
import { createDepositPreference, getAccessToken } from '@/lib/mercadopago';

/**
 * Genera el link de pago de la seña para un turno en "pending_payment".
 * El monto se calcula acá con los precios del negocio, nunca con lo que manda el navegador.
 * Si el negocio no cobra seña (o el monto da 0), confirma el turno directamente.
 */
export async function POST(req: NextRequest) {
  const { appointmentId } = await req.json().catch(() => ({}));
  if (!appointmentId) return NextResponse.json({ error: 'Falta appointmentId' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const ctx = await loadAppointmentContext(appointmentId);
  if (!ctx) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
  const { aptRef, apt, salon } = ctx;

  if (apt.status === 'confirmed') return NextResponse.json({ confirmed: true });
  if (apt.status !== 'pending_payment') {
    return NextResponse.json({ error: 'Esta reserva ya no está disponible. Volvé a reservar.' }, { status: 409 });
  }

  const config = getDepositConfig(salon);
  const createdMs = toMillis(apt.createdAt) ?? Date.now();
  // El vencimiento lo pone el navegador; el servidor no deja que pase del configurado por el negocio
  const maxExpiry = createdMs + (config.expiryMinutes + 2) * 60 * 1000;
  const expiresMs = Math.min(toMillis(apt.paymentExpiresAt) ?? maxExpiry, maxExpiry);
  if (Date.now() > expiresMs) {
    await aptRef.update({ status: 'expired', updatedAt: Date.now() });
    return NextResponse.json({ error: 'Se venció el tiempo para pagar la seña. Volvé a reservar.' }, { status: 410 });
  }

  const total = serviceTotal(ctx);
  const amount = computeDepositAmount(config, total);
  const confirmWithoutDeposit = async () => {
    await aptRef.update({ status: 'confirmed', depositStatus: 'none', paymentExpiresAt: null, updatedAt: Date.now() });
    return NextResponse.json({ confirmed: true });
  };

  if (!isDepositActive(salon) || amount <= 0) return confirmWithoutDeposit();

  // Transferencia: se avisa una sola vez al cliente y al negocio; confirma el dueño desde su panel
  if (config.method === 'transfer') {
    const notify = await adminDb().runTransaction(async tx => {
      const fresh = await tx.get(aptRef);
      if (fresh.data()?.transferNotifiedAt) return false;
      tx.update(aptRef, {
        depositMethod: 'transfer',
        depositStatus: 'pending',
        depositAmount: amount,
        serviceTotal: total,
        paymentExpiresAt: new Date(expiresMs),
        transferNotifiedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return true;
    });
    if (notify) await sendTransferInstructions(ctx, appointmentId, amount, expiresMs);
    return NextResponse.json({ transfer: true, amount, alias: salon?.paymentAlias || null });
  }

  if (apt.depositInitPoint && apt.depositAmount === amount) {
    return NextResponse.json({ initPoint: apt.depositInitPoint, amount });
  }

  try {
    const accessToken = await getAccessToken(apt.salonId);
    if (!accessToken) {
      console.error('[Seña] El negocio tiene la seña activa pero no hay credenciales de MP:', apt.salonId);
      return confirmWithoutDeposit();
    }

    const preference = await createDepositPreference(accessToken, {
      appointmentId,
      tenantId: apt.salonId,
      salonName: salon?.name || 'Turnify',
      serviceNames: ctx.services.map(s => s.name).join(', ') || 'Turno',
      amount,
      expiresAt: new Date(expiresMs),
    });

    await aptRef.update({
      depositMethod: 'mercadopago',
      depositStatus: 'pending',
      depositAmount: amount,
      serviceTotal: total,
      depositPreferenceId: preference.id,
      depositInitPoint: preference.init_point,
      paymentExpiresAt: new Date(expiresMs),
      updatedAt: Date.now(),
    });

    return NextResponse.json({ initPoint: preference.init_point, amount });
  } catch (e) {
    console.error('[Seña] No se pudo crear el pago:', e);
    return NextResponse.json({ error: 'No se pudo generar el pago. Probá de nuevo en unos segundos.' }, { status: 502 });
  }
}
