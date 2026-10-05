import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, isAdminConfigured } from '@/lib/firebase-admin';
import { createSalonForUser, userHasSalon } from '@/lib/business';
import { allowSignup, clientIp } from '@/lib/signup-limit';
import { notifyAdmins } from '@/lib/push';
import { SELF_SIGNUP_TRIAL_DAYS } from '@/lib/subscription-status';

/**
 * Registro con Google: el navegador ya inició sesión con Google y manda su token.
 * - { check: true } solo dice si esa cuenta ya tiene un negocio (para mandarla al panel).
 * - Si no, crea el negocio en plan Pro con la prueba gratis, igual que el registro con mail.
 */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) return NextResponse.json({ error: 'El registro no está disponible' }, { status: 500 });

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }
  if (decoded.firebase?.sign_in_provider !== 'google.com' || !decoded.email || decoded.email_verified === false) {
    return NextResponse.json({ error: 'Entrá con una cuenta de Google' }, { status: 400 });
  }
  const uid = decoded.uid;
  const email = decoded.email.toLowerCase();

  const body = await req.json().catch(() => ({}));
  if (await userHasSalon(uid)) return NextResponse.json({ ok: true, existing: true });
  if (body.check) return NextResponse.json({ ok: true, existing: false });
  if (body.website) return NextResponse.json({ ok: true }); // campo trampa para bots

  const name = String(body.businessName || '').trim().slice(0, 80);
  const whatsappNumber = String(body.whatsappNumber || '').replace(/\D/g, '').slice(0, 15);
  if (name.length < 2) return NextResponse.json({ error: 'Poné el nombre de tu negocio' }, { status: 400 });

  if (!(await allowSignup(clientIp(req)))) {
    return NextResponse.json({ error: 'Demasiados registros seguidos. Probá de nuevo en un rato.' }, { status: 429 });
  }

  try {
    const { salonId } = await createSalonForUser({
      uid, email, name, whatsappNumber,
      plan: 'pro',
      trialDays: SELF_SIGNUP_TRIAL_DAYS,
      createdBy: 'self-signup',
    });
    await notifyAdmins({
      title: 'Nuevo registro',
      body: `${name} · Pro (prueba ${SELF_SIGNUP_TRIAL_DAYS} días, se registró solo con Google) · ${email}${whatsappNumber ? ` · ${whatsappNumber}` : ''}`,
    });
    return NextResponse.json({ ok: true, salonId });
  } catch (e) {
    console.error('[Registro Google] Error:', e);
    return NextResponse.json({ error: 'No se pudo crear la cuenta. Probá de nuevo.' }, { status: 500 });
  }
}
