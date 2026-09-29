/** The public identifiers of a Firebase project. They end up in the bundle by design. */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

/** Repository variables read at build time, in the order the setup guide lists them. */
export const FIREBASE_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

/** The configuration, or null when any of the four values is missing: the app then runs locally. */
export function readFirebaseConfig(env: Record<string, string | undefined>): FirebaseConfig | null {
  const [apiKey, authDomain, projectId, appId] = FIREBASE_ENV_VARS.map(
    (name) => env[name]?.trim() ?? '',
  );
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}
