'use client';

import { useMemoFirebase, useCollection, useFirestore } from '@/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
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

    const ref = collection(db, 'salons', tenantId, 'professionals');

    // 1. Borrar todos los docs existentes (así se reflejan también las bajas)
    const existing = await getDocs(ref);
    const deleteBatch = writeBatch(db);
    existing.docs.forEach(d => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    // 2. Escribir los nuevos
    if (updatedProfessionals.length > 0) {
      const writeBatch2 = writeBatch(db);
      updatedProfessionals.forEach(prof => {
        const pRef = doc(db, 'salons', tenantId, 'professionals', prof.id);
        writeBatch2.set(pRef, prof);
      });
      await writeBatch2.commit();
    }
  };

  return { professionals, loading: isLoading, updateProfessionals };
}
