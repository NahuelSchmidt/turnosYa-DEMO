import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { isAdminConfigured, requireGlobalAdmin } from '@/lib/firebase-admin';
import { ADMIN_PUSH_TENANT, deletePushToken } from '@/lib/push';

/** Deja de mandarle notificaciones a este dispositivo. */
export async function POST(req: NextRequest) {
  const { tenantId, token } = await req.json().catch(() => ({}));
  if (!tenantId || !token) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  if (tenantId === ADMIN_PUSH_TENANT) {
    if (!(await requireGlobalAdmin(req.headers.get('authorization')))) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }
  } else {
    const auth = await requireSalonAdmin(req, tenantId);
    if (!auth.ok) return auth.response;
  }

  await deletePushToken(String(token), tenantId);
  return NextResponse.json({ ok: true });
}
