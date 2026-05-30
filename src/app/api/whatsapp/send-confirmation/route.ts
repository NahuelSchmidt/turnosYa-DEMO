import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getSalonById } from '@/lib/firestore-server';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function POST(req: NextRequest) {
  try {
    const { phone, message, tenantId, customerName, customerPhone, appointmentDate, serviceNames, professionalName } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Faltan campos: phone, message' }, { status: 400 });
    }

    let credentials;
    let salon;
    if (tenantId) {
      salon = await getSalonById(tenantId);
      if (salon?.evolutionInstanceName) {
        credentials = { instanceName: salon.evolutionInstanceName };
      }
    }

    // 1. Enviar confirmación al cliente
    const sent = await sendWhatsAppMessage(phone, message, credentials);

    // 2. Notificar al negocio del nuevo turno
    if (salon?.whatsappNumber && credentials) {
      const businessMsg = `📬 *Nuevo turno reservado*\n\n👤 ${customerName || 'Cliente'}\n📱 ${customerPhone || phone}\n🗓 ${appointmentDate || ''}\n📋 ${serviceNames || ''}${professionalName ? `\n👤 Con ${professionalName}` : ''}`;
      await sendWhatsAppMessage(salon.whatsappNumber, businessMsg, credentials);
    }

    return NextResponse.json({ sent });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
