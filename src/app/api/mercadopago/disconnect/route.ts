import { NextRequest, NextResponse } from 'next/server';
import { requireSalonAdmin } from '@/lib/api-auth';
import { adminDb, isAdminConfigured } from '@/lib/firebase-admin';

/** Desconecta la cuenta de Mercado Pago del negocio y apaga la seña. */
export async function POST(req: NextRequest) {
  const { tenantId } = await req.json().catch(() => ({}));
  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 });
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const auth = await requireSalonAdmin(req, tenantId);
  if (!auth.ok) return auth.response;

  const db = adminDb();
  await db.collection('mpAccounts').doc(tenantId).delete();
  await db.collection('salons').doc(tenantId).set({
    mpConnected: false,
    mpUserId: null,
    // Si la seña se cobraba por Mercado Pago, se apaga; si es por transferencia, sigue igual
    ...((auth.salon.deposit?.method || 'mercadopago') === 'mercadopago'
      ? { deposit: { ...(auth.salon.deposit || {}), enabled: false } }
      : {}),
  }, { merge: true });

  return NextResponse.json({ ok: true });
}
