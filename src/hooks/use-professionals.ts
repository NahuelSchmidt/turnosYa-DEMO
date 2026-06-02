'use client';

import { useMemoFirebase, useCollection, useFirestore } from '@/firebase';
import { collection, doc, writeBatch, deleteField } from 'firebase/firestore';
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
      if ((prof as any).weekSchedule === undefined) {
        // Si no tiene weekSchedule, borrarlo explícitamente de Firestore
        batch.set(pRef, { ...prof, weekSchedule: deleteField() }, { merge: true });
      } else {
        batch.set(pRef, prof, { merge: true });
      }
    });

    await batch.commit();
  };

  return { professionals, loading: isLoading, updateProfessionals };
}
