import { isIsoDateTime } from '../utils/dateUtils';
import { normalizeText, searchWords } from './filters';
import type { SearchMode } from './filters';
import type { Contact, ContactNote, MemoAuthor, PlanSnapshot } from './types';

// The people of the organization chart of the area «Contatti» (0.21, beta) and the notes on
// them: built by hand, shared by every member. Whom each one reports to makes the chart.

/** Longest texts of a person and of a note; the security rules enforce the same. */
export const CONTACT_NAME_MAX = 100;
export const CONTACT_TEXT_MAX = 100;
export const CONTACT_EMAIL_MAX = 200;
export const CONTACT_PHONE_MAX = 40;
export const CONTACT_NOTE_MAX = 5000;

/** What a new person holds. */
export type ContactContent = Omit<Contact, 'id'>;

/** Fields of a person to change; null removes an optional one. */
export interface ContactChanges {
  name?: string;
  role?: string | null;
  team?: string | null;
  email?: string | null;
  phone?: string | null;
  managerId?: string | null;
}

/** What a new note holds; its time and author are set by whoever saves it. */
export type ContactNoteContent = Pick<ContactNote, 'contactId' | 'text'>;

export interface ContactNoteChanges {
  text?: string;
}

const OPTIONAL_FIELDS = ['role', 'team', 'email', 'phone', 'managerId'] as const;

/** The people by name, whatever the case and the accents; the id breaks ties. */
export function sortContacts(contacts: readonly Contact[]): Contact[] {
  return [...contacts].sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }) || a.id.localeCompare(b.id),
  );
}

/** The notes newest first; the id breaks ties. */
export function sortContactNotes(notes: readonly ContactNote[]): ContactNote[] {
  return [...notes].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  );
}

export function notesOfContact(notes: readonly ContactNote[], contactId: string): ContactNote[] {
  return sortContactNotes(notes.filter((note) => note.contactId === contactId));
}

/** The fields that differ between a person and what the window saves; blanks remove a field. */
export function diffContact(before: Contact, after: ContactContent): ContactChanges {
  const changes: ContactChanges = {};
  const name = after.name.trim();
  if (name && name !== before.name) changes.name = name;
  for (const field of OPTIONAL_FIELDS) {
    const value = after[field]?.trim() || undefined;
    if (value !== before[field]) changes[field] = value ?? null;
  }
  return changes;
}

/** A person of the chart with the people who report to them, by name. */
export interface ContactNode {
  contact: Contact;
  reports: ContactNode[];
}

/**
 * The organization chart: the people at the top, each with whom reports to them, by name. A
 * person whose manager is missing, or whose chain of managers comes back to them, is at the top,
 * so that nobody is ever lost.
 */
export function contactTree(contacts: readonly Contact[]): ContactNode[] {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]));
  const isTop = (contact: Contact): boolean => {
    const seen = new Set([contact.id]);
    let manager = contact.managerId ? byId.get(contact.managerId) : undefined;
    while (manager) {
      // A loop: the person who closes it is the top of it.
      if (seen.has(manager.id)) return contact.id === loopTop(manager, byId);
      seen.add(manager.id);
      manager = manager.managerId ? byId.get(manager.managerId) : undefined;
    }
    return !contact.managerId || !byId.has(contact.managerId);
  };
  const node = (contact: Contact, path: Set<string>): ContactNode => ({
    contact,
    reports: sortContacts(
      contacts.filter(
        (other) => other.managerId === contact.id && !isTop(other) && !path.has(other.id),
      ),
    ).map((other) => node(other, new Set([...path, other.id]))),
  });
  return sortContacts(contacts.filter(isTop)).map((contact) =>
    node(contact, new Set([contact.id])),
  );
}

/** The person of a loop of managers that stands at the top: the first by name. */
function loopTop(start: Contact, byId: ReadonlyMap<string, Contact>): string {
  const loop: Contact[] = [];
  let current: Contact | undefined = start;
  while (current && !loop.includes(current)) {
    loop.push(current);
    current = current.managerId ? byId.get(current.managerId) : undefined;
  }
  return sortContacts(loop)[0]?.id ?? start.id;
}

/** The ids of whoever reports to a person, directly or not. */
export function reportsOf(contacts: readonly Contact[], contactId: string): Set<string> {
  const found = new Set<string>();
  let frontier = [contactId];
  while (frontier.length > 0) {
    const next = contacts
      .filter((contact) => contact.managerId && frontier.includes(contact.managerId))
      .map((contact) => contact.id)
      .filter((id) => id !== contactId && !found.has(id));
    for (const id of next) found.add(id);
    frontier = next;
  }
  return found;
}

/** Whom a person can report to: anyone but themselves and their own reports, by name. */
export function managerChoices(contacts: readonly Contact[], contactId: string | null): Contact[] {
  const excluded = contactId ? reportsOf(contacts, contactId) : new Set<string>();
  return sortContacts(
    contacts.filter((contact) => contact.id !== contactId && !excluded.has(contact.id)),
  );
}

/** The managers of a person, from the closest up to the top. */
export function managersOf(contacts: readonly Contact[], contactId: string): Contact[] {
  const byId = new Map(contacts.map((contact) => [contact.id, contact]));
  const chain: Contact[] = [];
  let manager = byId.get(contactId)?.managerId;
  while (manager && !chain.some((item) => item.id === manager)) {
    const contact = byId.get(manager);
    if (!contact) break;
    chain.push(contact);
    manager = contact.managerId;
  }
  return chain;
}

/**
 * The people a search finds: in their name, role, team, email, phone or notes. The chart then
 * shows them with their managers, so that each one keeps its place.
 */
export function filterContacts(
  contacts: readonly Contact[],
  notes: readonly ContactNote[],
  search: string,
  mode: SearchMode = 'all',
): Contact[] {
  const words = searchWords(search);
  if (words.length === 0) return [...contacts];
  return contacts.filter((contact) => {
    const text = normalizeText(
      [
        contact.name,
        contact.role,
        contact.team,
        contact.email,
        contact.phone,
        ...notes.filter((note) => note.contactId === contact.id).map((note) => note.text),
      ]
        .filter(Boolean)
        .join(' \n '),
    );
    return mode === 'any'
      ? words.some((word) => text.includes(word))
      : words.every((word) => text.includes(word));
  });
}

/** The people to draw for the found ones: those, and their managers up to the top. */
export function withManagers(contacts: readonly Contact[], found: readonly Contact[]): Contact[] {
  const ids = new Set(found.map((contact) => contact.id));
  for (const contact of found) {
    for (const manager of managersOf(contacts, contact.id)) ids.add(manager.id);
  }
  return contacts.filter((contact) => ids.has(contact.id));
}

type Data = Record<string, unknown>;

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Text to keep: undefined when absent or blank, null when not a text or too long. */
function optionalText(value: unknown, max: number): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > max) return null;
  return value.trim() ? value : undefined;
}

/** A person from their data, as a backup or a document holds it; null when it does not fit. */
export function parseContact(id: string, value: unknown): Contact | null {
  if (!isData(value) || !id) return null;
  const { name } = value;
  if (typeof name !== 'string' || !name.trim() || name.length > CONTACT_NAME_MAX) return null;
  const contact: Contact = { id, name };
  const limits = {
    role: CONTACT_TEXT_MAX,
    team: CONTACT_TEXT_MAX,
    email: CONTACT_EMAIL_MAX,
    phone: CONTACT_PHONE_MAX,
    managerId: 100,
  };
  for (const field of OPTIONAL_FIELDS) {
    const text = optionalText(value[field], limits[field]);
    if (text === null) return null;
    if (text) contact[field] = text;
  }
  if (contact.managerId === id) delete contact.managerId;
  return contact;
}

/** A note on a person from its data; null when it does not fit. */
export function parseContactNote(id: string, value: unknown): ContactNote | null {
  if (!isData(value) || !id) return null;
  const { contactId, text, createdAt } = value;
  if (typeof contactId !== 'string' || !contactId.trim()) return null;
  if (typeof text !== 'string' || !text.trim() || text.length > CONTACT_NOTE_MAX) return null;
  if (!isIsoDateTime(createdAt)) return null;
  const note: ContactNote = { id, contactId, text, createdAt };
  if (isData(value.author)) {
    const { id: authorId, login } = value.author;
    if (typeof authorId !== 'string' || typeof login !== 'string' || !authorId || !login)
      return null;
    note.author = { id: authorId, login } satisfies MemoAuthor;
  }
  return note;
}

/** The plan with a person more. */
export function addContact(plan: PlanSnapshot, contact: Contact): PlanSnapshot {
  return { ...plan, contacts: sortContacts([...plan.contacts, contact]) };
}

/** The plan with a person changed: a field set to null goes away. */
export function updateContact(
  plan: PlanSnapshot,
  contactId: string,
  changes: ContactChanges,
): PlanSnapshot {
  return {
    ...plan,
    contacts: sortContacts(
      plan.contacts.map((contact) => {
        if (contact.id !== contactId) return contact;
        const next: Record<string, unknown> = { ...contact };
        for (const [field, value] of Object.entries(changes)) {
          if (value === null) delete next[field];
          else if (value !== undefined) next[field] = value;
        }
        return next as unknown as Contact;
      }),
    ),
  };
}

/**
 * Whom the people reporting to a person report to once they are gone: to the manager of that
 * person, or to nobody, at the top of the chart. Nobody is lost.
 */
export function reportsMovedUp(
  contacts: readonly Contact[],
  contactId: string,
): { id: string; managerId: string | null }[] {
  const managerId = contacts.find((contact) => contact.id === contactId)?.managerId ?? null;
  return contacts
    .filter((contact) => contact.managerId === contactId)
    .map((contact) => ({ id: contact.id, managerId }));
}

/** The plan without a person and the notes on them; who reported to them moves up. */
export function removeContact(plan: PlanSnapshot, contactId: string): PlanSnapshot {
  let next: PlanSnapshot = {
    ...plan,
    contacts: plan.contacts.filter((contact) => contact.id !== contactId),
    contactNotes: plan.contactNotes.filter((note) => note.contactId !== contactId),
  };
  for (const { id, managerId } of reportsMovedUp(plan.contacts, contactId)) {
    next = updateContact(next, id, { managerId });
  }
  return next;
}

export function addContactNote(plan: PlanSnapshot, note: ContactNote): PlanSnapshot {
  return { ...plan, contactNotes: sortContactNotes([...plan.contactNotes, note]) };
}

export function updateContactNote(
  plan: PlanSnapshot,
  noteId: string,
  changes: ContactNoteChanges,
): PlanSnapshot {
  return {
    ...plan,
    contactNotes: plan.contactNotes.map((note) =>
      note.id === noteId && changes.text ? { ...note, text: changes.text } : note,
    ),
  };
}

export function removeContactNote(plan: PlanSnapshot, noteId: string): PlanSnapshot {
  return { ...plan, contactNotes: plan.contactNotes.filter((note) => note.id !== noteId) };
}
