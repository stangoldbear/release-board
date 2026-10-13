import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import {
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
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
 * Connects to the project. Nothing of the plan or of the sign-in stays on the disk: the cache is
 * in memory, and the sign-in lasts as long as the tab. A shared computer keeps no copy, and the
 * other sites of the same origin, as the Pages sites of an organization, have nothing to read.
 * With `emulators`, Auth and Firestore are the local emulators of the Firebase CLI (development
 * only).
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
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  // The DEV check lets the production build leave the emulator code out entirely.
  if (import.meta.env.DEV && emulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    installEmulatorSignIn(auth);
  }
  // A sign-in kept on the disk by an earlier version moves to the tab, and leaves the disk.
  void setPersistence(auth, browserSessionPersistence);
  forgetPersistentCache(config.projectId);
  const services = { app, auth, db };
  created.set(config.projectId, services);
  return services;
}

/**
 * Deletes the copy of the plan that versions before 0.16 kept in IndexedDB, and the bookkeeping
 * of its tabs in localStorage. Not awaited: a tab of such a version still open keeps the database
 * until it closes, and the deletion waits for it.
 */
function forgetPersistentCache(projectId: string): void {
  const prefix = `firestore/[DEFAULT]/${projectId}/`;
  try {
    indexedDB.deleteDatabase(`${prefix}main`);
  } catch {
    // Without IndexedDB there is nothing to forget.
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('firestore_') && key.includes(prefix)) localStorage.removeItem(key);
    }
  } catch {
    // Without storage there is nothing to forget either.
  }
}
