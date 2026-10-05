// Alta de negocios: usuario del dueño + negocio vinculado.
// La usan el super-admin ("Nuevo negocio") y el registro gratuito público.

import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const PLANS = ['basic', 'pro', 'premium'] as const;
export type Plan = typeof PLANS[number];

export class BusinessError extends Error {}

function slugify(text: string) {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'negocio';
}

export function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

interface CreateBusinessInput {
  name: string;
  email: string;
  password: string;
  plan: Plan;
  trialDays: number;
  whatsappNumber: string;
  createdBy: string;            // uid del admin, o 'self-signup'
  allowExistingUser: boolean;   // el super-admin puede sumar un negocio a una cuenta que ya existe
}

export async function createBusinessAccount(input: CreateBusinessInput) {
  const auth = adminAuth();
  const db = adminDb();
  const email = input.email.trim().toLowerCase();

  let uid: string;
  let existingUser = false;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
    existingUser = true;
  } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') throw new BusinessError('No se pudo verificar el mail');
    if (input.password.length < 6) throw new BusinessError('La clave tiene que tener al menos 6 caracteres');
    try {
      uid = (await auth.createUser({ email, password: input.password, displayName: input.name })).uid;
    } catch (err: any) {
      throw new BusinessError(err?.code === 'auth/invalid-password'
        ? 'La clave no es válida (mínimo 6 caracteres)'
        : 'No se pudo crear el usuario');
    }
  }
  if (existingUser && !input.allowExistingUser) {
    throw new BusinessError('Ese mail ya tiene una cuenta. Iniciá sesión desde el panel.');
  }

  const { salonId, trialEndsAt } = await createSalonForUser({
    uid, email, name: input.name, plan: input.plan, trialDays: input.trialDays,
    whatsappNumber: input.whatsappNumber, createdBy: input.createdBy,
  });
  return { salonId, uid, existingUser, trialEndsAt };
}

interface CreateSalonInput {
  uid: string;
  email: string;
  name: string;
  plan: Plan;
  trialDays: number;
  whatsappNumber: string;
  createdBy: string;
}

/** Crea el negocio de un usuario que ya existe (registro con mail o con Google). */
export async function createSalonForUser(input: CreateSalonInput) {
  const db = adminDb();
  const salonId = `${slugify(input.name)}-${randomBytes(3).toString('hex')}`;
  const trialEndsAt = input.trialDays > 0 ? new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000) : null;

  await db.collection('salons').doc(salonId).set({
    id: salonId,
    name: input.name,
    email: input.email,
    plan: input.plan,
    adminMembers: { [input.uid]: true },
    isActive: true,
    primaryColor: '#000000',
    whatsappNumber: input.whatsappNumber,
    timeSlots: [],
    ...(trialEndsAt ? { subscriptionExpiresAt: trialEndsAt, trialEndsAt, subscriptionStatus: 'trial' } : {}),
    createdBy: input.createdBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection('userProfiles').doc(input.uid).set({
    id: input.uid,
    externalAuthId: input.uid,
    email: input.email,
    role: 'owner',
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { salonId, trialEndsAt };
}

/** ¿Este usuario ya administra algún negocio? */
export async function userHasSalon(uid: string) {
  const snap = await adminDb().collection('salons').where(`adminMembers.${uid}`, '==', true).limit(1).get();
  return !snap.empty;
}
