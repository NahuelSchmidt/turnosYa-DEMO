import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { BASE_URL, API_KEY } from '@/lib/firestore-server';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;

/**
 * Crea (si no existe) la instancia de Evolution del negocio y la vincula al salón
 * guardando `evolutionInstanceName`. Es idempotente: si ya existe, no hace nada.
 */
export async function POST(req: NextRequest) {
  const { tenantId } = await req.json().catch(() => ({}));

  if (!tenantId) {
    return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });
  }

  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    return NextResponse.json({ error: 'Evolution API no configurado' }, { status: 500 });
  }

  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;

  const instanceName: string = auth.salon.evolutionInstanceName || tenantId;

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

  if (!res.ok) {
    const text = await res.text();
    // Si la instancia ya existe en Evolution, seguimos: solo falta vincularla
    if (!/already in use|already exists/i.test(text)) {
      return NextResponse.json({ error: 'No se pudo crear la instancia' }, { status: 502 });
    }
  }

  // Guardamos el vínculo con el token del usuario: las reglas de Firestore validan que sea admin del salón
  if (auth.salon.evolutionInstanceName !== instanceName) {
    const patch = await fetch(
      `${BASE_URL}/salons/${tenantId}?updateMask.fieldPaths=evolutionInstanceName&key=${API_KEY}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.idToken}` },
        body: JSON.stringify({ fields: { evolutionInstanceName: { stringValue: instanceName } } }),
      }
    );
    if (!patch.ok) {
      return NextResponse.json({ error: 'No se pudo vincular la instancia al negocio' }, { status: 502 });
    }
  }

  return NextResponse.json({ instanceName });
}
