
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';

let firestoreInstance: Firestore | null = null;

export function initializeFirebase() {
  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  if (!firestoreInstance) {
    // Check if firestore is already initialized to avoid "already called" error
    try {
      firestoreInstance = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (e: any) {
      // If initialization fails because it was already called, just get the instance
      firestoreInstance = getFirestore(firebaseApp);
    }
  }

  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore: firestoreInstance, auth };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
