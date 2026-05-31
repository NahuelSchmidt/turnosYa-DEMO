'use client';

import { useMemoFirebase, useCollection, useFirestore } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Branch } from '@/lib/data';

export function useBranches(tenantId: string) {
  const db = useFirestore();

  const branchesRef = useMemoFirebase(() => {
    if (!db || !tenantId) return null;
    return collection(db, 'salons', tenantId, 'branches');
  }, [db, tenantId]);

  const { data: rawBranches, isLoading } = useCollection<Branch>(branchesRef);
  const branches = rawBranches || [];

  const addBranch = (branch: Omit<Branch, 'id'>) => {
    if (!db) return null;
    const ref = doc(collection(db, 'salons', tenantId, 'branches'));
    setDocumentNonBlocking(ref, {
      ...branch,
      id: ref.id,
      createdAt: serverTimestamp(),
    }, { merge: true });
    return ref.id;
  };

  const updateBranch = (branchId: string, updates: Partial<Branch>) => {
    if (!db) return;
    const ref = doc(db, 'salons', tenantId, 'branches', branchId);
    updateDocumentNonBlocking(ref, { ...updates, updatedAt: serverTimestamp() });
  };

  const deleteBranch = (branchId: string) => {
    if (!db) return;
    const ref = doc(db, 'salons', tenantId, 'branches', branchId);
    updateDocumentNonBlocking(ref, { deleted: true });
  };

  return { branches: branches.filter(b => !(b as any).deleted), loading: isLoading, addBranch, updateBranch, deleteBranch };
}
