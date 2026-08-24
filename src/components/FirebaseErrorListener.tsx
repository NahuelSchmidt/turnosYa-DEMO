'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 */
export function FirebaseErrorListener() {
  // Use the specific error type for the state for type safety.
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    // The callback now expects a strongly-typed error, matching the event payload.
    const handleError = (error: FirestorePermissionError) => {
      // En producción no tiramos abajo toda la app por un permiso denegado puntual
      // (rompía la SPA entera para cualquier usuario ante cualquier error de reglas,
      // incluso uno acotado a una sola escritura). Solo lo logueamos.
      if (process.env.NODE_ENV !== 'production') {
        setError(error);
      } else {
        console.error(error);
      }
    };

    // The typed emitter will enforce that the callback for 'permission-error'
    // matches the expected payload type (FirestorePermissionError).
    errorEmitter.on('permission-error', handleError);

    // Unsubscribe on unmount to prevent memory leaks.
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // On re-render, if an error exists in state, throw it (solo en desarrollo).
  if (error) {
    throw error;
  }

  // This component renders nothing.
  return null;
}
