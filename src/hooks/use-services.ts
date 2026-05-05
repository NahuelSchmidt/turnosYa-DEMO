'use client';

import { useMemoFirebase, useCollection, useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Service, initialServices } from '@/lib/data';

export function useServices(tenantId: string = 'default') {
  const db = useFirestore();

  const servicesRef = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return collection(db, 'salons', tenantId, 'services');
  }, [db, tenantId]);

  const { data, isLoading } = useCollection<Service>(servicesRef);
  
  // Si es el tenant de demo y no hay datos, devolvemos los iniciales
  const services = (data && data.length > 0) ? data : (tenantId === 'admin-tenant-1' ? initialServices : []);

  const updateServices = async (updatedServices: Service[]) => {
    if (!db || !tenantId) return;
    
    const batch = writeBatch(db);
    
    updatedServices.forEach(service => {
        const sRef = doc(db, 'salons', tenantId, 'services', service.id);
        batch.set(sRef, service, { merge: true });
    });
    
    await batch.commit();
  };

  return { services, loading: isLoading, updateServices };
}
