'use client';

import { useMemoFirebase, useDoc, useFirestore } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function useSalon(salonId: string) {
  const db = useFirestore();

  const salonRef = useMemoFirebase(() => {
    if (!db || !salonId || salonId === 'default') return null;
    return doc(db, 'salons', salonId);
  }, [db, salonId]);

  const { data: rawSalon, isLoading } = useDoc<any>(salonRef);

  // Fallback para demo
  const salon = rawSalon || (salonId === 'admin-tenant-1' ? {
    id: 'admin-tenant-1',
    name: 'Barbería "El Estilo"',
    primaryColor: '#000000',
    address: 'Av. Corrientes 1234, CABA'
  } : null);

  const updateSalon = (updates: any) => {
    if (!db || !salonId || salonId === 'default') return;
    const sRef = doc(db, 'salons', salonId);
    
    setDocumentNonBlocking(sRef, { 
      ...updates, 
      updatedAt: serverTimestamp() 
    }, { merge: true });
  };

  return { salon, loading: isLoading, updateSalon };
}
