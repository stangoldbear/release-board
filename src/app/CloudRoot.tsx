import { useEffect, useState } from 'react';
import { parseBackupText } from '../domain/backup';
import type { PlanSnapshot } from '../domain/types';
import { CreatePlanWizard } from '../features/setup/CreatePlanWizard';
import { NotMemberScreen } from '../features/setup/NotMemberScreen';
import { SignInScreen } from '../features/setup/SignInScreen';
import { FirestoreMembersRepository } from '../infra/firebase/FirestoreMembersRepository';
import { FirestorePlanRepository } from '../infra/firebase/FirestorePlanRepository';
import type { Actor } from '../infra/firebase/FirestorePlanRepository';
import { createFirebaseServices } from '../infra/firebase/app';
import type { FirebaseServices } from '../infra/firebase/app';
import { signInWithGitHub, signOutFromFirebase, subscribeToAccount } from '../infra/firebase/auth';
import type { Account } from '../infra/firebase/auth';
import type { FirebaseConfig } from '../infra/firebase/config';
import { PLAN_ID } from '../infra/firebase/planDocs';
import { checkAccess, createPlan } from '../infra/firebase/setup';
import type { Access } from '../infra/firebase/setup';
import {
  lookupGitHubNameById,
  lookupGitHubUser,
  lookupGitHubUserById,
} from '../infra/github/users';
import { PLAN_STORAGE_KEY } from '../infra/LocalPlanRepository';
import { LoadingScreen } from '../shared/ui/Screen';
import { createId } from '../utils/id';
import App from './App';
import type { Instance } from './Instance';
import { LocalRoot } from './LocalRoot';

interface CloudRootProps {
  config: FirebaseConfig;
  emulators: boolean;
}

/**
 * The app with a Firebase project: sign-in, then the plan of the instance. Loaded only when the
 * project is configured, so copies without one never download the SDK.
 */
export default function CloudRoot({ config, emulators }: CloudRootProps) {
  const [services] = useState(() => createFirebaseServices(config, emulators));
  // Undefined until Firebase says whether someone is signed in.
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [local, setLocal] = useState(false);

  useEffect(() => subscribeToAccount(services.auth, setAccount), [services]);

  if (local) return <LocalRoot onSignIn={() => setLocal(false)} />;
  if (account === undefined) return <LoadingScreen message="Verifica dell'accesso…" />;
  if (account === null) {
    return (
      <SignInScreen
        projectId={config.projectId}
        onSignIn={async () => {
          await signInWithGitHub(services.auth);
        }}
        onTryLocal={() => setLocal(true)}
      />
    );
  }
  return (
    <CloudSession
      key={account.uid}
      services={services}
      account={account}
      projectId={config.projectId}
      onSignOut={() => signOutFromFirebase(services.auth)}
    />
  );
}

/** The plan saved by the local mode of this browser, offered by the wizard as a starting point. */
function readLocalPlan(): PlanSnapshot | null {
  try {
    const stored = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!stored) return null;
    const result = parseBackupText(stored);
    return result.ok ? result.plan : null;
  } catch {
    return null;
  }
}

interface CloudSessionProps {
  services: FirebaseServices;
  account: Account;
  projectId: string;
  onSignOut: () => Promise<void>;
}

type AccessState = Access | { kind: 'checking' } | { kind: 'error'; message: string };

/** Signed in: finds out whether the plan exists and whether the account is a member of it. */
function CloudSession({ services, account, projectId, onSignOut }: CloudSessionProps) {
  const [access, setAccess] = useState<AccessState>({ kind: 'checking' });
  const [lookedUpLogin, setLookedUpLogin] = useState<string | null>(null);
  const githubId = account.githubId;

  useEffect(() => {
    if (!githubId) return;
    let cancelled = false;
    checkAccess(services.db, PLAN_ID, githubId).then(
      (result) => {
        if (!cancelled) setAccess(result);
      },
      (failure: unknown) => {
        if (!cancelled) {
          setAccess({
            kind: 'error',
            message:
              failure instanceof Error ? failure.message : "Verifica dell'accesso non riuscita.",
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [services, githubId]);

  // Firebase keeps the GitHub id, not the username: the member document has it, the sign-in
  // did, or GitHub can say. Otherwise the wizard asks.
  const login = (access.kind === 'member' ? access.login : null) || account.login || lookedUpLogin;

  useEffect(() => {
    if (login || !githubId || access.kind === 'checking' || access.kind === 'member') return;
    let cancelled = false;
    lookupGitHubUserById(githubId).then(
      (user) => {
        if (!cancelled && user) setLookedUpLogin(user.login);
      },
      () => {
        // Nothing to do: the wizard asks for the username instead.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [login, githubId, access.kind]);

  if (!githubId) {
    return (
      <NotMemberScreen
        planName=""
        login={account.login}
        error="L'account non è collegato a GitHub: esci e accedi di nuovo con GitHub."
        onSignOut={onSignOut}
      />
    );
  }
  if (access.kind === 'checking') return <LoadingScreen message="Apertura del piano…" />;
  if (access.kind === 'error') {
    return (
      <NotMemberScreen planName="" login={login} error={access.message} onSignOut={onSignOut} />
    );
  }

  if (access.kind === 'no-plan') {
    return (
      <CreatePlanWizard
        login={login}
        localPlan={readLocalPlan()}
        onSignOut={onSignOut}
        onCreate={async (name, chosenLogin, plan) => {
          const actor: Actor = { uid: account.uid, githubId, login: chosenLogin };
          await createPlan(services.db, PLAN_ID, actor, name, account.avatarUrl ?? '', createId);
          // Now a member: the content goes in like any import.
          const repository = new FirestorePlanRepository({
            db: services.db,
            planId: PLAN_ID,
            actor,
            createId,
          });
          await repository.whenReady();
          repository.replacePlan(plan);
          repository.dispose();
          setAccess({
            kind: 'member',
            planName: name,
            role: 'owner',
            login: chosenLogin,
            avatarUrl: account.avatarUrl ?? '',
          });
        }}
      />
    );
  }

  if (access.kind === 'not-member') {
    return <NotMemberScreen planName={access.planName} login={login} onSignOut={onSignOut} />;
  }

  // Members always have a login: the rules require it in the member document.
  const actor: Actor = { uid: account.uid, githubId, login: access.login };
  return (
    <MemberSession
      services={services}
      actor={actor}
      account={account}
      access={access}
      projectId={projectId}
      onSignOut={onSignOut}
    />
  );
}

interface MemberSessionProps {
  services: FirebaseServices;
  actor: Actor;
  account: Account;
  access: Extract<Access, { kind: 'member' }>;
  projectId: string;
  onSignOut: () => Promise<void>;
}

interface Session {
  repository: FirestorePlanRepository;
  members: FirestoreMembersRepository;
}

/** A member of the plan: the calendar on the shared data. */
function MemberSession({
  services,
  actor,
  account,
  access,
  projectId,
  onSignOut,
}: MemberSessionProps) {
  const [session, setSession] = useState<Session | { error: string } | null>(null);
  const { uid, githubId, login } = actor;

  // The repositories live as long as this effect: React may run it more than once, and a
  // disposed repository cannot be reused.
  useEffect(() => {
    const member: Actor = { uid, githubId, login };
    const repository = new FirestorePlanRepository({
      db: services.db,
      planId: PLAN_ID,
      actor: member,
      createId,
    });
    const members = new FirestoreMembersRepository({
      db: services.db,
      planId: PLAN_ID,
      actor: member,
      createId,
      lookupUser: lookupGitHubUser,
    });
    let cancelled = false;
    repository.whenReady().then(
      () => {
        if (!cancelled) setSession({ repository, members });
      },
      (failure: unknown) => {
        if (!cancelled) {
          setSession({
            error: failure instanceof Error ? failure.message : 'Piano non leggibile.',
          });
        }
      },
    );
    return () => {
      cancelled = true;
      repository.dispose();
    };
  }, [services, uid, githubId, login]);

  if (session === null) return <LoadingScreen message="Caricamento del piano…" />;
  if ('error' in session) {
    return (
      <NotMemberScreen
        planName={access.planName}
        login={login}
        error={session.error}
        onSignOut={onSignOut}
      />
    );
  }

  const instance: Instance = {
    kind: 'cloud',
    projectId,
    planName: access.planName,
    user: {
      githubId,
      login,
      name: account.name,
      avatarUrl: account.avatarUrl ?? (access.avatarUrl || null),
    },
    role: access.role,
    members: session.members,
    history: session.repository,
    lookupName: lookupGitHubNameById,
    signOut: onSignOut,
  };
  return <App repository={session.repository} instance={instance} loadWarning={null} />;
}
