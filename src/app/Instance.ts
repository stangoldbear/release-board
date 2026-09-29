import type { HistoryReader } from './HistoryReader';
import type { MembersRepository, Role } from './MembersRepository';

/** The signed-in member, for the account section and the history. */
export interface SignedInUser {
  githubId: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
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
      signOut: () => Promise<void>;
    };
