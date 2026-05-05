
'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Inicia una operación setDoc.
 * No espera internamente el resultado pero captura errores de permisos.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options?: SetOptions) {
  setDoc(docRef, data, options || {}).catch(error => {
    // Si es un error de permisos, lo emitimos para el feedback visual
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: options && 'merge' in options ? 'update' : 'write',
        requestResourceData: data,
      } satisfies SecurityRuleContext);
      
      errorEmitter.emit('permission-error', permissionError);
    }
  });
}

/**
 * Inicia una operación addDoc.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  return addDoc(colRef, data).catch(error => {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: colRef.path,
        operation: 'create',
        requestResourceData: data,
      } satisfies SecurityRuleContext);
      
      errorEmitter.emit('permission-error', permissionError);
    }
  });
}

/**
 * Inicia una operación updateDoc.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data).catch(error => {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      } satisfies SecurityRuleContext);
      
      errorEmitter.emit('permission-error', permissionError);
    }
  });
}

/**
 * Inicia una operación deleteDoc.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef).catch(error => {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      
      errorEmitter.emit('permission-error', permissionError);
    }
  });
}
