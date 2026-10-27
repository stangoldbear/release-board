import type { NameLookup } from './authorNames';
import type { ChangeUndo } from './ChangeUndo';
import type { HistoryReader } from './HistoryReader';
import type { MembersRepository, Role } from './MembersRepository';

/** The signed-in member, for the account section and the history. */
export interface SignedInUser {
  githubId: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  /** The email of the account, as the security rules read it, and whether it is verified. */
  email: string | null;
  emailVerified: boolean;
}

/** Where this copy of the app keeps its data, and what that makes available. */
export type Instance =
  | {
      kind: 'local';
      /** In a configured instance, the way back to the sign-in screen. */
      onSignIn?: () => void;
    }
  | {
      kind: 'cloud';
      projectId: string;
      planName: string;
      user: SignedInUser;
      role: Role;
      members: MembersRepository;
      history: HistoryReader;
      /** Undo and redo of the member's own changes, from the history. */
      undo: ChangeUndo;
      /** The full name of a member, from their GitHub profile, to show beside what they wrote. */
      lookupName: NameLookup;
      signOut: () => Promise<void>;
    };

/**
 * Who may replace the whole plan, with a backup or the sample: in a shared instance only the
 * owner, as a backup keeps the authors of its notes and the rules accept that from the owner
 * alone; in this browser, anyone.
 */
export function canReplacePlan(instance: Instance): boolean {
  return instance.kind === 'local' || instance.role === 'owner';
}
