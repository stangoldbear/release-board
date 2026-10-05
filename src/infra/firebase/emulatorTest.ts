import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import rules from '../../../firestore/firestore.rules?raw';

// Helpers for the tests that run against the Firestore emulator (npm run test:rules).

export const PROJECT_ID = 'demo-release-board';

/** A signed-in GitHub user, as the rules see it. */
export interface Identity {
  uid: string;
  githubId: string;
  login: string;
}

export const OWNER: Identity = { uid: 'uid-owner', githubId: '1001', login: 'owner' };
export const EDITOR: Identity = { uid: 'uid-editor', githubId: '1002', login: 'editor' };
export const STRANGER: Identity = { uid: 'uid-stranger', githubId: '1003', login: 'stranger' };

function emulatorAddress(): { host: string; port: number } {
  // Vitest exposes the process environment through import.meta.env.
  const address = import.meta.env.FIRESTORE_EMULATOR_HOST;
  if (!address) throw new Error('FIRESTORE_EMULATOR_HOST is not set: run npm run test:rules.');
  const [host = '127.0.0.1', port = '8080'] = address.split(':');
  return { host, port: Number(port) };
}

/**
 * Loads the rules into the emulator and gives access to it with the rules switched off. Other
 * rules go in another project, so that both can be used at once.
 */
export function setupRulesEnvironment(otherRules?: {
  rules: string;
  projectId: string;
}): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: otherRules?.projectId ?? PROJECT_ID,
    firestore: { rules: otherRules?.rules ?? rules, ...emulatorAddress() },
  });
}

let clientCount = 0;

/** A Firestore client that the emulator sees as the given user, or as nobody. */
export function clientAs(identity: Identity | null, projectId = PROJECT_ID): Firestore {
  const { host, port } = emulatorAddress();
  clientCount += 1;
  const app = initializeApp({ projectId, apiKey: 'emulator' }, `test-${clientCount}`);
  const db = getFirestore(app);
  connectFirestoreEmulator(
    db,
    host,
    port,
    identity
      ? {
          mockUserToken: {
            sub: identity.uid,
            firebase: {
              sign_in_provider: 'github.com',
              identities: { 'github.com': [identity.githubId] },
            },
          },
        }
      : undefined,
  );
  return db;
}

export async function deleteClients(): Promise<void> {
  await Promise.all(getApps().map((app) => deleteApp(app)));
}
