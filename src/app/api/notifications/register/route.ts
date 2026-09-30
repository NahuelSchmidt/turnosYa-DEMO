import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { savePushToken } from '@/lib/push';

/** Guarda este dispositivo para mandarle las notificaciones del negocio. */
export async function POST(req: NextRequest) {
  const { tenantId, token } = await req.json().catch(() => ({}));
  if (!tenantId || !token) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;

  await savePushToken(tenantId, auth.uid, String(token), req.headers.get('user-agent') || '');
  return NextResponse.json({ ok: true });
}
