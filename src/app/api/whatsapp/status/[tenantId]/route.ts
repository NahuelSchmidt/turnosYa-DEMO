import { NextRequest, NextResponse } from 'next/server';
import { getSalonById } from '@/lib/firestore-server';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    return NextResponse.json({ state: 'notConfigured' });
  }

  const salon = await getSalonById(tenantId);
  const instanceName = salon?.evolutionInstanceName;

  if (!instanceName) {
    return NextResponse.json({ state: 'notConfigured' });
  }

  const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
    headers: { 'apikey': EVOLUTION_KEY },
  });

  if (!res.ok) {
    return NextResponse.json({ state: 'error' });
  }

  const data = await res.json();
  // data.instance.state: 'open' | 'close' | 'connecting'
  const state = data?.instance?.state === 'open' ? 'authorized' : 'notAuthorized';
  return NextResponse.json({ state });
}
