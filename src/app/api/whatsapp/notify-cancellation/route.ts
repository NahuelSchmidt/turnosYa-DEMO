import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getSalonById } from '@/lib/firestore-server';

export async function POST(req: NextRequest) {
  try {
    const { tenantId, customerName, customerPhone, appointmentDate, serviceNames } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });
    }

    const salon = await getSalonById(tenantId);
    if (!salon?.whatsappNumber || !salon?.evolutionInstanceName) {
      return NextResponse.json({ sent: false });
    }

    const credentials = { instanceName: salon.evolutionInstanceName };
    const msg = `❌ *Turno cancelado*\n\n👤 ${customerName}\n📱 ${customerPhone}\n🗓 ${appointmentDate}\n📋 ${serviceNames}\n\nEl cliente canceló su turno.`;

    const sent = await sendWhatsAppMessage(salon.whatsappNumber, msg, credentials);
    return NextResponse.json({ sent });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
