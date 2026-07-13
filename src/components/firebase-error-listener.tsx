
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // In development, Next.js handles uncaught exceptions with an overlay.
      // We also show a toast for better visibility.
      toast({
        variant: "destructive",
        title: "Sicherheitsfehler (Firestore)",
        description: `Zugriff verweigert: ${error.context.operation} auf ${error.context.path}. Bitte prüfe deine Security Rules.`,
      });
      
      // Re-throw to trigger the Next.js error overlay in development
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
