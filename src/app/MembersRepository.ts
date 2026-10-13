export type Role = 'owner' | 'editor';

/** Someone allowed into the plan, identified by their GitHub account. */
export interface Member {
  githubId: string;
  login: string;
  avatarUrl: string;
  role: Role;
}

export type InviteResult = 'added' | 'already-member' | 'not-found';

/** The list of members of the plan, managed by its owner. */
export interface MembersRepository {
  subscribe(listener: (members: Member[]) => void): () => void;
  /** Adds the GitHub user with this username as an editor. */
  invite(login: string): Promise<InviteResult>;
  setRole(githubId: string, role: Role): Promise<void>;
  remove(githubId: string): Promise<void>;
  /** The email domains the plan admits; null while it admits every email. */
  subscribeDomains(listener: (domains: string[] | null) => void): () => void;
  /** Admits only the accounts with a verified email of these domains, or everyone with null. */
  setDomains(domains: string[] | null): Promise<void>;
}
