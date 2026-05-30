import { NextRequest, NextResponse } from 'next/server';
import { getSalonById } from '@/lib/firestore-server';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    return NextResponse.json({ error: 'Evolution API no configurado' }, { status: 500 });
  }

  const salon = await getSalonById(tenantId);
  const instanceName = salon?.evolutionInstanceName;

  if (!instanceName) {
    return NextResponse.json({ error: 'Instancia no configurada para este negocio' }, { status: 400 });
  }

  const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
    headers: { 'apikey': EVOLUTION_KEY },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Error al obtener QR' }, { status: 502 });
  }

  const data = await res.json();
  // data.base64 contiene el QR en base64
  return NextResponse.json(data);
}
