import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { installEmulatorSignIn } from './auth';
import type { FirebaseConfig } from './config';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const created = new Map<string, FirebaseServices>();

/**
 * Connects to the project. The persistent cache keeps the plan available offline, queues the
 * changes made without network and shares them between the tabs of the browser. With
 * `emulators`, Auth and Firestore are the local emulators of the Firebase CLI (development only).
 *
 * Calling it again for the same project returns the same services: the SDK can be initialized
 * once, and React's StrictMode runs state initializers twice.
 */
export function createFirebaseServices(
  config: FirebaseConfig,
  emulators = false,
): FirebaseServices {
  const existing = created.get(config.projectId);
  if (existing) return existing;
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  // The DEV check lets the production build leave the emulator code out entirely.
  if (import.meta.env.DEV && emulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    installEmulatorSignIn(auth);
  }
  const services = { app, auth, db };
  created.set(config.projectId, services);
  return services;
}
