import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Role } from '../../app/MembersRepository';
import type { Actor } from './FirestorePlanRepository';

/** What the signed-in user finds in the instance. */
export type Access =
  | { kind: 'no-plan' }
  | { kind: 'not-member'; planName: string }
  | { kind: 'member'; planName: string; role: Role; login: string; avatarUrl: string };

/** Reads the plan and the user's own membership: the two documents the rules open to everyone. */
export async function checkAccess(
  db: Firestore,
  planId: string,
  githubId: string,
): Promise<Access> {
  const plan = await getDoc(doc(db, `plans/${planId}`));
  if (!plan.exists()) return { kind: 'no-plan' };
  const planName = typeof plan.data().name === 'string' ? (plan.data().name as string) : '';
  const member = await getDoc(doc(db, `plans/${planId}/members/${githubId}`));
  if (!member.exists()) return { kind: 'not-member', planName };
  const data = member.data();
  return {
    kind: 'member',
    planName,
    role: data.role === 'owner' ? 'owner' : 'editor',
    login: typeof data.login === 'string' ? data.login : '',
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : '',
  };
}

/**
 * Creates the plan with the actor as its owner: plan document, membership and the first history
 * entry in one batch, as the rules require. The content is imported afterwards, as a member.
 */
export async function createPlan(
  db: Firestore,
  planId: string,
  actor: Actor,
  name: string,
  avatarUrl: string,
  createId: () => string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, `plans/${planId}`), {
    name: name.trim(),
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, `plans/${planId}/members/${actor.githubId}`), {
    login: actor.login,
    avatarUrl,
    role: 'owner',
    addedBy: actor.uid,
    addedAt: serverTimestamp(),
  });
  batch.set(doc(db, `plans/${planId}/history/${createId()}`), {
    entity: 'plan',
    entityId: planId,
    action: 'setup',
    actor: { ...actor },
    at: serverTimestamp(),
    after: { name: name.trim() },
  });
  await batch.commit();
}
