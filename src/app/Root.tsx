import { Suspense, lazy } from 'react';
import type { FirebaseConfig } from '../infra/firebase/config';
import { LoadingScreen } from '../shared/ui/Screen';
import { LocalRoot } from './LocalRoot';

// The Firebase SDK and everything that needs it load only when a project is configured.
const CloudRoot = lazy(() => import('./CloudRoot'));

interface RootProps {
  firebaseConfig: FirebaseConfig | null;
  /** Development only: use the local Auth and Firestore emulators. */
  emulators: boolean;
}

/** Chooses between the shared instance and the local mode. */
export function Root({ firebaseConfig, emulators }: RootProps) {
  if (!firebaseConfig) return <LocalRoot />;
  return (
    <Suspense fallback={<LoadingScreen message="Caricamento…" />}>
      <CloudRoot config={firebaseConfig} emulators={emulators} />
    </Suspense>
  );
}
