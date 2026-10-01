import {
  GithubAuthProvider,
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { Auth, User, UserCredential } from 'firebase/auth';

/** The signed-in person. The GitHub id is what the plan's member list knows them by. */
export interface Account {
  uid: string;
  githubId: string | null;
  /** The GitHub username, when known: Firebase does not keep it, only the id. */
  login: string | null;
  name: string | null;
  avatarUrl: string | null;
}

const LOGIN_KEY = 'release-board:github-login';

/** Told when a sign-in reveals the username, which Firebase itself does not store. */
const loginListeners = new Set<() => void>();

function rememberLogin(uid: string, login: string): void {
  try {
    sessionStorage.setItem(`${LOGIN_KEY}:${uid}`, login);
  } catch {
    // Without storage the username is looked up again from GitHub when needed.
  }
  for (const listener of loginListeners) listener();
}

function rememberedLogin(uid: string): string | null {
  try {
    return sessionStorage.getItem(`${LOGIN_KEY}:${uid}`);
  } catch {
    return null;
  }
}

export function toAccount(user: User): Account {
  const github = user.providerData.find((provider) => provider.providerId === 'github.com');
  return {
    uid: user.uid,
    githubId: github?.uid ?? null,
    login: rememberedLogin(user.uid),
    name: user.displayName,
    avatarUrl: user.photoURL,
  };
}

/**
 * Calls the listener with the current account (null when signed out) and after every change.
 * Firebase announces a sign-in before the sign-in call returns the username, so the listener is
 * called once more as soon as the username is known.
 */
export function subscribeToAccount(
  auth: Auth,
  listener: (account: Account | null) => void,
): () => void {
  let current: User | null = null;
  const emit = () => listener(current ? toAccount(current) : null);
  const stopAuth = onAuthStateChanged(auth, (user) => {
    current = user;
    emit();
  });
  const onLogin = () => {
    if (current) emit();
  };
  loginListeners.add(onLogin);
  return () => {
    stopAuth();
    loginListeners.delete(onLogin);
  };
}

/** Keeps what the sign-in told about the person that Firebase itself does not store. */
function completeSignIn(result: UserCredential): Account {
  // For GitHub the SDK takes it from the raw profile ("login").
  const username = getAdditionalUserInfo(result)?.username;
  if (username) rememberLogin(result.user.uid, username);
  return toAccount(result.user);
}

/** Opens the GitHub sign-in popup. Resolves to null when the person closes it. */
export async function signInWithGitHub(auth: Auth): Promise<Account | null> {
  const provider = new GithubAuthProvider();
  // Members are invited: nobody needs to create a GitHub account from here.
  provider.setCustomParameters({ allow_signup: 'false' });
  try {
    return completeSignIn(await signInWithPopup(auth, provider));
  } catch (error) {
    const code = authErrorCode(error);
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null;
    }
    throw new Error(describeAuthError(code), { cause: error });
  }
}

/** The fake GitHub profile the Auth emulator accepts in place of a real token. */
export interface EmulatorClaims {
  /** The GitHub id. */
  sub: string;
  email: string;
  /** The GitHub username, as in the raw profile. */
  login: string;
  name?: string;
  picture?: string;
}

/**
 * Development with the emulators only: lets automated tests sign in without the popup, which
 * the emulator cannot complete offline. The emulator reads the profile from the fake token.
 */
export function installEmulatorSignIn(auth: Auth): void {
  const hook = (claims: EmulatorClaims) =>
    signInWithCredential(auth, GithubAuthProvider.credential(JSON.stringify(claims))).then(
      completeSignIn,
    );
  (
    window as unknown as { __releaseBoardEmulatorSignIn?: typeof hook }
  ).__releaseBoardEmulatorSignIn = hook;
}

export function signOutFromFirebase(auth: Auth): Promise<void> {
  return signOut(auth);
}

function authErrorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}

/**
 * A sentence for the user. When the project is misconfigured it names the step of the setup guide
 * to check, by its title: the step numbers differ between the guides for new and existing projects.
 */
export function describeAuthError(code: string): string {
  // Firebase turns the server errors it does not know into codes, keeping their details: the
  // restrictions of the API key produce codes that go on with the blocked site or API.
  if (code.startsWith('auth/requests-from-referer-')) {
    return 'La chiave API non accetta richieste da questo sito: controlla le sue restrizioni dei siti web (nella guida, «Crea una chiave API dedicata»).';
  }
  if (code.startsWith('auth/requests-to-this-api-')) {
    return "La chiave API non consente le API dell'accesso: controlla le sue restrizioni delle API (nella guida, «Crea una chiave API dedicata»).";
  }
  if (code.startsWith('auth/api-key-not-valid')) {
    return 'La chiave API non è valida: controlla la variabile VITE_FIREBASE_API_KEY (nella guida, «Imposta le variabili del sito»).';
  }
  switch (code) {
    case 'auth/popup-blocked':
      return 'Il browser ha bloccato la finestra di accesso: consenti i popup per questo sito e riprova.';
    case 'auth/unauthorized-domain':
      return 'Questo indirizzo non è tra i domini autorizzati del progetto Firebase (nella guida, «Autorizza il dominio del sito»).';
    case 'auth/operation-not-allowed':
      return 'Il provider GitHub non è attivo in Firebase Authentication (nella guida, «Attiva il provider GitHub»).';
    case 'auth/network-request-failed':
      return 'Rete non disponibile: riprova quando sei connesso.';
    case 'auth/account-exists-with-different-credential':
      return 'Esiste già un account con la stessa email ma un altro provider.';
    default:
      return `Accesso non riuscito${code ? ` (${code})` : ''}.`;
  }
}
