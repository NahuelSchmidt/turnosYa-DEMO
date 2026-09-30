import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { isAdminConfigured } from '@/lib/firebase-admin';
import { deletePushToken } from '@/lib/push';

/** Deja de mandarle notificaciones a este dispositivo. */
export async function POST(req: NextRequest) {
  const { tenantId, token } = await req.json().catch(() => ({}));
  if (!tenantId || !token) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;

  await deletePushToken(String(token));
  return NextResponse.json({ ok: true });
}
