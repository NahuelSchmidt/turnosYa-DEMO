import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { APP_URL, connectAccount } from '@/lib/mercadopago';

const STATE_TTL_MS = 30 * 60 * 1000;

/** Mercado Pago vuelve acá después de que el negocio autoriza (o rechaza) la conexión. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const back = (result: string) => NextResponse.redirect(`${APP_URL}/dashboard?tab=settings&mp=${result}`);

  if (!code || !state) return back('cancelled');

  const db = adminDb();
  const stateRef = db.collection('mpOAuthStates').doc(state);
  const stateSnap = await stateRef.get();
  if (!stateSnap.exists) return back('error');

  const { tenantId, uid, createdAt } = stateSnap.data()!;
  await stateRef.delete();
  if (Date.now() - createdAt > STATE_TTL_MS) return back('error');

  try {
    const token = await connectAccount(tenantId, code, uid);
    await db.collection('salons').doc(tenantId).set({
      mpConnected: true,
      mpUserId: String(token.user_id),
      mpConnectedAt: Date.now(),
    }, { merge: true });
    return back('ok');
  } catch (e) {
    console.error('[MercadoPago] Error conectando cuenta:', e);
    return back('error');
  }
}
