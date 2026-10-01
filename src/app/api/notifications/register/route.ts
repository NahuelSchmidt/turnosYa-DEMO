import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { isAdminConfigured, requireGlobalAdmin } from '@/lib/firebase-admin';
import { ADMIN_PUSH_TENANT, savePushToken } from '@/lib/push';

/** Guarda este dispositivo para mandarle las notificaciones del negocio. */
export async function POST(req: NextRequest) {
  const { tenantId, token } = await req.json().catch(() => ({}));
  if (!tenantId || !token) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  let uid: string;
  if (tenantId === ADMIN_PUSH_TENANT) {
    const adminUid = await requireGlobalAdmin(req.headers.get('authorization'));
    if (!adminUid) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    uid = adminUid;
  } else {
    const auth = await requireSalonAdmin(req, tenantId);
    if (!auth.ok) return auth.response;
    uid = auth.uid;
  }

  await savePushToken(tenantId, uid, String(token), req.headers.get('user-agent') || '');
  return NextResponse.json({ ok: true });
}
