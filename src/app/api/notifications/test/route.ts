import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { notifySalon } from '@/lib/push';

/** Notificación de prueba para que el dueño vea que le llegan. */
export async function POST(req: NextRequest) {
  const { tenantId } = await req.json().catch(() => ({}));
  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });

  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;

  const sent = await notifySalon(tenantId, {
    title: 'Turnify',
    body: '¡Listo! Así te vamos a avisar cada vez que entre un turno.',
  });
  return NextResponse.json({ sent });
}
