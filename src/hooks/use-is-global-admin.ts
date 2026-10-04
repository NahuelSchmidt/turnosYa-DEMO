"use client";

import { createContext, useContext } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';

/** ¿El usuario es administrador de Turnify? (las reglas solo le dejan leer su propio registro) */
export function useIsGlobalAdmin() {
  const { user } = useUser();
  const db = useFirestore();
  const ref = useMemoFirebase(() => {
    if (!db || !user?.uid || user.isAnonymous) return null;
    return doc(db, 'globalAdmins', user.uid);
  }, [db, user?.uid, user?.isAnonymous]);
  const { data, isLoading } = useDoc(ref);
  return { isGlobalAdmin: !!data, isLoading };
}

/** true cuando el administrador de Turnify está viendo el panel de un negocio ajeno. */
export const AdminViewContext = createContext(false);
export const useAdminView = () => useContext(AdminViewContext);
