import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { toMillis } from '@/lib/deposit-server';
import {
  buildBusinessNewBooking, buildCustomerConfirmation, buildProfessionalNewBooking, callerUid, canManageSalon, notifyProfessional,
  loadAppointmentWithRetry, markOnce,
} from '@/lib/wa-notify';

const MAX_MESSAGE = 1500;

/**
 * WhatsApp al cliente de un turno. Siempre va al teléfono guardado en el turno.
 * - El negocio (dueño o admin de Turnify) puede mandar su mensaje: confirmación de un
 *   turno que cargó, reprogramación o cancelación.
 * - El cliente que acaba de reservar solo puede pedir su confirmación, una vez, y el
 *   texto lo arma el servidor.
 */
export async function POST(req: NextRequest) {
  try {
    const { appointmentId, message } = await req.json().catch(() => ({}));
    if (!appointmentId) return NextResponse.json({ error: 'Falta appointmentId' }, { status: 400 });
    if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

    const uid = await callerUid(req);
    if (!uid) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const ctx = await loadAppointmentWithRetry(String(appointmentId));
    if (!ctx) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    const { apt, salon } = ctx;
    const isManager = await canManageSalon(uid, ctx);
    if (!isManager && apt.customerId !== uid) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    if (!apt.customerPhone) return NextResponse.json({ sent: false });
    const credentials = salon?.evolutionInstanceName ? { instanceName: salon.evolutionInstanceName } : undefined;
    if (!credentials) return NextResponse.json({ sent: false });

    // El negocio manda su propio mensaje a su cliente
    if (isManager) {
      const text = String(message || '').slice(0, MAX_MESSAGE) || buildCustomerConfirmation(ctx);
      const sent = await sendWhatsAppMessage(apt.customerPhone, text, credentials);
      return NextResponse.json({ sent });
    }

    // El cliente pide la confirmación de la reserva que acaba de hacer
    if (apt.status !== 'confirmed' || apt.depositStatus === 'paid' || apt.depositStatus === 'pending') {
      return NextResponse.json({ sent: false });
    }
    const createdMs = toMillis(apt.createdAt) || 0;
    if (createdMs && Date.now() - createdMs > 60 * 60 * 1000) return NextResponse.json({ sent: false });
    if (!(await markOnce(ctx, 'confirmationSentAt'))) return NextResponse.json({ sent: true, already: true });

    const sent = await sendWhatsAppMessage(apt.customerPhone, buildCustomerConfirmation(ctx), credentials);
    if (salon?.whatsappNumber) await sendWhatsAppMessage(salon.whatsappNumber, buildBusinessNewBooking(ctx), credentials);
    await notifyProfessional(ctx, buildProfessionalNewBooking(ctx));
    return NextResponse.json({ sent });
  } catch (e: any) {
    console.error('[WhatsApp] send-confirmation:', e?.message);
    return NextResponse.json({ error: 'No se pudo enviar' }, { status: 500 });
  }
}
