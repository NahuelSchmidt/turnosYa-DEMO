// Acceso a Firestore con permisos de servidor (saltea las reglas).
// Solo para lo que no puede hacer un usuario: guardar las credenciales de
// Mercado Pago de cada negocio y confirmar turnos cuando se acredita la seña.
// Requiere la variable FIREBASE_SERVICE_ACCOUNT con el JSON de la cuenta de servicio.

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export function isAdminConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT;
}

export function adminDb(): Firestore {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT no configurado');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}
