import { NextRequest, NextResponse } from 'next/server';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(req: NextRequest) {
  const { instanceName } = await req.json();

  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    return NextResponse.json({ error: 'Evolution API no configurado' }, { status: 500 });
  }

  if (!instanceName) {
    return NextResponse.json({ error: 'Falta instanceName' }, { status: 400 });
  }

  const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_KEY,
    },
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : 400 });
}
