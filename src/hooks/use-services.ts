'use client';

import { useMemoFirebase, useCollection, useFirestore } from '@/firebase';
import { collection, doc, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { Service, initialServices } from '@/lib/data';

export function useServices(tenantId: string = 'default') {
  const db = useFirestore();

  const servicesRef = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return collection(db, 'salons', tenantId, 'services');
  }, [db, tenantId]);

  const { data, isLoading } = useCollection<Service>(servicesRef);
  
  const services = (data && data.length > 0) ? data : (tenantId === 'admin-tenant-1' ? initialServices : []);

  const updateServices = async (updatedServices: Service[]) => {
    if (!db || !tenantId) return;
    
    const ref = collection(db, 'salons', tenantId, 'services');
    
    // 1. Borrar todos los docs existentes
    const existing = await getDocs(ref);
    const deleteBatch = writeBatch(db);
    existing.docs.forEach(d => deleteBatch.delete(d.ref));
    await deleteBatch.commit();
    
    // 2. Escribir los nuevos
    if (updatedServices.length > 0) {
      const writeBatch2 = writeBatch(db);
      updatedServices.forEach(service => {
        const sRef = doc(db, 'salons', tenantId, 'services', service.id);
        writeBatch2.set(sRef, service);
      });
      await writeBatch2.commit();
    }
  };

  return { services, loading: isLoading, updateServices };
}
