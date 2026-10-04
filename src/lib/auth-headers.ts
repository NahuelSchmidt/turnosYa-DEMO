"use client";

import { getAuth } from 'firebase/auth';

/** Headers con el token de la sesión actual (anónima o del negocio) para las APIs de Turnify. */
export async function authJsonHeaders(): Promise<Record<string, string>> {
  const token = await getAuth().currentUser?.getIdToken().catch(() => null);
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
