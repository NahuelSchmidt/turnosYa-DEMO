// Acceso a Firestore con permisos de servidor (saltea las reglas).
// Solo para lo que no puede hacer un usuario: guardar las credenciales de
// Mercado Pago de cada negocio y confirmar turnos cuando se acredita la seña.
// Requiere la variable FIREBASE_SERVICE_ACCOUNT con el JSON de la cuenta de servicio.

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

export function isAdminConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT;
}

function ensureApp() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT no configurado');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
}

export function adminDb(): Firestore {
  ensureApp();
  return getFirestore();
}

export function adminAuth(): Auth {
  ensureApp();
  return getAuth();
}

/** Verifica que el request venga de un administrador global de Turnify. */
export async function requireGlobalAdmin(authorization: string | null): Promise<string | null> {
  const idToken = authorization?.replace(/^Bearer\s+/i, '');
  if (!idToken) return null;
  try {
    const { uid } = await adminAuth().verifyIdToken(idToken);
    const snap = await adminDb().collection('globalAdmins').doc(uid).get();
    return snap.exists ? uid : null;
  } catch {
    return null;
  }
}
