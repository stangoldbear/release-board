/// <reference types="vite/client" />

/** Version from package.json, injected at build time. */
declare const __APP_VERSION__: string;
/** Short git commit of the build, injected at build time. */
declare const __BUILD_COMMIT__: string;
/** ISO timestamp of the build, injected at build time. */
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  /** Set by firestore/with-emulator.sh for the tests that run against the emulator. */
  readonly FIRESTORE_EMULATOR_HOST?: string;
}

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** "true" makes the app talk to the local Auth and Firestore emulators (development only). */
  readonly VITE_FIREBASE_EMULATORS?: string;
}
