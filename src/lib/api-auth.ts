import { NextRequest, NextResponse } from 'next/server';
import { getSalonById, API_KEY } from '@/lib/firestore-server';

type SalonAdminResult =
  | { ok: true; uid: string; idToken: string; salon: Record<string, any> }
  | { ok: false; response: NextResponse };

/**
 * Verifica que el request venga de un usuario logueado (ID token de Firebase en
 * el header Authorization) que sea admin del salón indicado.
 */
export async function requireSalonAdmin(req: NextRequest, tenantId: string): Promise<SalonAdminResult> {
  const idToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!idToken) {
    return { ok: false, response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!lookup.ok) {
    return { ok: false, response: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }

  const uid: string | undefined = (await lookup.json()).users?.[0]?.localId;
  const salon = await getSalonById(tenantId);
  if (!uid || !salon || salon.adminMembers?.[uid] !== true) {
    return { ok: false, response: NextResponse.json({ error: 'Sin permiso sobre este negocio' }, { status: 403 }) };
  }

  return { ok: true, uid, idToken, salon };
}
