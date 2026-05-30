import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getSalonById } from '@/lib/firestore-server';

export async function POST(req: NextRequest) {
  try {
    const { phone, message, tenantId } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Faltan campos: phone, message' }, { status: 400 });
    }

    let credentials;
    if (tenantId) {
      const salon = await getSalonById(tenantId);
      if (salon?.evolutionInstanceName) {
        credentials = { instanceName: salon.evolutionInstanceName };
      }
    }

    const sent = await sendWhatsAppMessage(phone, message, credentials);
    return NextResponse.json({ sent });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
