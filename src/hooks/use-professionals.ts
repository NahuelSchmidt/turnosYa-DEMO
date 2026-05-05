'use client';

import { useMemoFirebase, useCollection, useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Professional, initialProfessionals } from '@/lib/data';

export function useProfessionals(tenantId: string = 'default') {
  const db = useFirestore();

  const professionalsRef = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return collection(db, 'salons', tenantId, 'professionals');
  }, [db, tenantId]);

  const { data, isLoading } = useCollection<Professional>(professionalsRef);
  
  // Fallback para demo
  const professionals = (data && data.length > 0) ? data : (tenantId === 'admin-tenant-1' ? initialProfessionals : []);

  const updateProfessionals = async (updatedProfessionals: Professional[]) => {
    if (!db || !tenantId) return;
    
    const batch = writeBatch(db);
    updatedProfessionals.forEach(prof => {
        const pRef = doc(db, 'salons', tenantId, 'professionals', prof.id);
        batch.set(pRef, prof, { merge: true });
    });
    
    await batch.commit();
  };

  return { professionals, loading: isLoading, updateProfessionals };
}
