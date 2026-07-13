
'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize Firebase only once on the client using useMemo
  const { firebaseApp, firestore, auth } = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
