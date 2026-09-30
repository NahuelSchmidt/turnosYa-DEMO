import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, isAdminConfigured, requireGlobalAdmin } from '@/lib/firebase-admin';
import { APP_URL } from '@/lib/mercadopago';

const PLANS = ['basic', 'pro', 'premium'];

function slugify(text: string) {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'negocio';
}

/**
 * Alta de un negocio desde el super-admin: crea (o reutiliza) el usuario del dueño
 * con su mail y clave, y el negocio vinculado a ese usuario, con el plan y la prueba gratis.
 */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) return NextResponse.json({ error: 'Servidor no configurado' }, { status: 500 });

  const adminUid = await requireGlobalAdmin(req.headers.get('authorization'));
  if (!adminUid) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.businessName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const plan = PLANS.includes(body.plan) ? body.plan : 'basic';
  const trialDays = Math.max(0, Math.min(90, Number(body.trialDays) || 0));
  const whatsappNumber = String(body.whatsappNumber || '').replace(/\D/g, '');

  if (!name) return NextResponse.json({ error: 'Falta el nombre del negocio' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'El mail no es válido' }, { status: 400 });

  const auth = adminAuth();
  const db = adminDb();

  // Si el mail ya tiene cuenta (ej: un dueño con dos negocios), se reutiliza y la clave no se toca
  let uid: string;
  let existingUser = false;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
    existingUser = true;
  } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') {
      return NextResponse.json({ error: 'No se pudo verificar el mail' }, { status: 500 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La clave tiene que tener al menos 6 caracteres' }, { status: 400 });
    }
    try {
      uid = (await auth.createUser({ email, password, displayName: name })).uid;
    } catch (err: any) {
      const msg = err?.code === 'auth/invalid-password' ? 'La clave no es válida (mínimo 6 caracteres)' : 'No se pudo crear el usuario';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const salonId = `${slugify(name)}-${randomBytes(3).toString('hex')}`;
  const now = Date.now();
  const trialEndsAt = trialDays > 0 ? new Date(now + trialDays * 24 * 60 * 60 * 1000) : null;

  await db.collection('salons').doc(salonId).set({
    id: salonId,
    name,
    email,
    plan,
    adminMembers: { [uid]: true },
    isActive: true,
    primaryColor: '#000000',
    whatsappNumber,
    timeSlots: [],
    ...(trialEndsAt ? { subscriptionExpiresAt: trialEndsAt, trialEndsAt, subscriptionStatus: 'trial' } : {}),
    createdBy: adminUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection('userProfiles').doc(uid).set({
    id: uid,
    externalAuthId: uid,
    email,
    role: 'owner',
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return NextResponse.json({
    salonId,
    existingUser,
    dashboardUrl: `${APP_URL}/dashboard`,
    bookingUrl: `${APP_URL}/book/${salonId}`,
    trialEndsAt: trialEndsAt?.toISOString() || null,
  });
}
