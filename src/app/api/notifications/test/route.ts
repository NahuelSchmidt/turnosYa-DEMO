import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { requireGlobalAdmin } from '@/lib/firebase-admin';
import { ADMIN_PUSH_TENANT, notifySalon } from '@/lib/push';

/** Notificación de prueba para que el dueño vea que le llegan. */
export async function POST(req: NextRequest) {
  const { tenantId } = await req.json().catch(() => ({}));
  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });

  if (tenantId === ADMIN_PUSH_TENANT) {
    if (!(await requireGlobalAdmin(req.headers.get('authorization')))) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }
  } else {
    const auth = await requireSalonAdmin(req, tenantId);
    if (!auth.ok) return auth.response;
  }

  const sent = await notifySalon(tenantId, tenantId === ADMIN_PUSH_TENANT
    // Igual a un aviso real, para ver cómo llega
    ? { title: 'Nueva suscripción 🎉', body: 'Barbería de prueba · Pro · $19.900 por Mercado Pago', path: '/super-admin' }
    : { title: 'Turnify', body: '¡Listo! Así te vamos a avisar cada vez que entre un turno.' });
  return NextResponse.json({ sent });
}
