import { collection, doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { InviteResult, Member, MembersRepository, Role } from '../../app/MembersRepository';
import type { GitHubUser } from '../github/users';
import type { Actor } from './FirestorePlanRepository';

interface Options {
  db: Firestore;
  planId: string;
  actor: Actor;
  createId: () => string;
  /** Finds the GitHub account with a username; null when there is none. */
  lookupUser: (login: string) => Promise<GitHubUser | null>;
}

const ROLE_ORDER: Record<Role, number> = { owner: 0, editor: 1 };

/** The document of the settings with the email domains the plan admits. */
const ACCESS_ID = 'access';

/** The members of the plan in Firestore. Changes wait for the server, so failures can be shown. */
export class FirestoreMembersRepository implements MembersRepository {
  private readonly db: Firestore;
  private readonly planPath: string;
  private readonly actor: Actor;
  private readonly createId: () => string;
  private readonly lookupUser: Options['lookupUser'];
  private members: Member[] = [];
  private domains: string[] | null = null;

  constructor({ db, planId, actor, createId, lookupUser }: Options) {
    this.db = db;
    this.planPath = `plans/${planId}`;
    this.actor = actor;
    this.createId = createId;
    this.lookupUser = lookupUser;
  }

  subscribe(listener: (members: Member[]) => void): () => void {
    return onSnapshot(collection(this.db, `${this.planPath}/members`), (snapshot) => {
      this.members = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            githubId: item.id,
            login: typeof data.login === 'string' ? data.login : '',
            avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : '',
            role: data.role === 'owner' ? ('owner' as const) : ('editor' as const),
          };
        })
        .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.login.localeCompare(b.login));
      listener(this.members);
    });
  }

  async invite(login: string): Promise<InviteResult> {
    const user = await this.lookupUser(login.trim());
    if (!user) return 'not-found';
    if (this.members.some((member) => member.githubId === user.id)) return 'already-member';
    const batch = writeBatch(this.db);
    batch.set(this.memberRef(user.id), {
      login: user.login,
      avatarUrl: user.avatarUrl,
      role: 'editor',
      addedBy: this.actor.uid,
      addedAt: serverTimestamp(),
    });
    this.record(batch, 'member', user.id, 'create', {
      after: { login: user.login, role: 'editor' },
    });
    await batch.commit();
    return 'added';
  }

  async setRole(githubId: string, role: Role): Promise<void> {
    const member = this.members.find((item) => item.githubId === githubId);
    const batch = writeBatch(this.db);
    batch.update(this.memberRef(githubId), { role });
    this.record(batch, 'member', githubId, 'update', {
      before: { login: member?.login ?? '', role: member?.role ?? '' },
      after: { login: member?.login ?? '', role },
    });
    await batch.commit();
  }

  async remove(githubId: string): Promise<void> {
    const member = this.members.find((item) => item.githubId === githubId);
    const batch = writeBatch(this.db);
    batch.delete(this.memberRef(githubId));
    this.record(batch, 'member', githubId, 'delete', {
      before: { login: member?.login ?? '', role: member?.role ?? '' },
    });
    await batch.commit();
  }

  subscribeDomains(listener: (domains: string[] | null) => void): () => void {
    return onSnapshot(this.accessRef(), (snapshot) => {
      const domains: unknown = snapshot.data()?.domains;
      this.domains = Array.isArray(domains)
        ? domains.filter((item): item is string => typeof item === 'string')
        : null;
      listener(this.domains);
    });
  }

  async setDomains(domains: string[] | null): Promise<void> {
    const before = this.domains ? { domains: this.domains } : undefined;
    const batch = writeBatch(this.db);
    if (domains === null) {
      this.record(batch, 'access', ACCESS_ID, 'delete', { ...(before && { before }) });
      batch.delete(this.accessRef());
    } else {
      const historyId = this.record(batch, 'access', ACCESS_ID, before ? 'update' : 'create', {
        ...(before && { before }),
        after: { domains },
      });
      batch.set(this.accessRef(), {
        domains,
        updatedAt: serverTimestamp(),
        updatedBy: this.actor.uid,
        lastHistoryId: historyId,
      });
    }
    await batch.commit();
  }

  private memberRef(githubId: string) {
    return doc(this.db, `${this.planPath}/members/${githubId}`);
  }

  private accessRef() {
    return doc(this.db, `${this.planPath}/settings/${ACCESS_ID}`);
  }

  /**
   * The history entry of the change, whose id it returns. A member document has no room for the
   * entry's id: the writer's document carries it, as the rules require.
   */
  private record(
    batch: ReturnType<typeof writeBatch>,
    entity: 'member' | 'access',
    entityId: string,
    action: 'create' | 'update' | 'delete',
    details: { before?: DocumentData; after?: DocumentData },
  ): string {
    const historyId = this.createId();
    batch.set(doc(this.db, `${this.planPath}/history/${historyId}`), {
      entity,
      entityId,
      action,
      actor: { ...this.actor },
      at: serverTimestamp(),
      ...details,
    });
    batch.set(doc(this.db, `${this.planPath}/writers/${this.actor.uid}`), {
      historyId,
      at: serverTimestamp(),
    });
    return historyId;
  }
}
