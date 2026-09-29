import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Root } from './app/Root';
import { readFirebaseConfig } from './infra/firebase/config';
import { ToastProvider } from './shared/ui/Toast';
import './index.css';

// Composition root: the Firebase project comes from the build, everything else from Root.
const firebaseConfig = readFirebaseConfig(import.meta.env);
const emulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Root firebaseConfig={firebaseConfig} emulators={emulators} />
    </ToastProvider>
  </StrictMode>,
);
