import { describe, expect, it } from 'vitest';
import {
  addContactNote,
  contactTree,
  diffContact,
  filterContacts,
  managerChoices,
  managersOf,
  parseContact,
  parseContactNote,
  removeContact,
  reportsOf,
  updateContact,
  withManagers,
} from './contacts';
import type { ContactNode } from './contacts';
import { createEmptyPlan } from './plan';
import type { Contact, ContactNote } from './types';

const people: Contact[] = [
  { id: 'ceo', name: 'Direzione' },
  { id: 'cto', name: 'Tecnologia', managerId: 'ceo', role: 'Responsabile tecnico' },
  { id: 'cfo', name: 'Amministrazione', managerId: 'ceo' },
  { id: 'dev', name: 'Sviluppo', managerId: 'cto', team: 'Prodotto' },
  { id: 'qa', name: 'Qualità', managerId: 'cto', email: 'qa@example.com' },
];

const shape = (nodes: readonly ContactNode[]): unknown[] =>
  nodes.map((node) =>
    node.reports.length > 0 ? [node.contact.id, shape(node.reports)] : node.contact.id,
  );

describe('the organization chart', () => {
  it('puts every person under their manager, by name', () => {
    expect(shape(contactTree(people))).toEqual([['ceo', ['cfo', ['cto', ['qa', 'dev']]]]]);
  });

  it('puts at the top whoever has a missing manager, and breaks a loop of managers', () => {
    const odd: Contact[] = [
      { id: 'a', name: 'Anna', managerId: 'b' },
      { id: 'b', name: 'Bruno', managerId: 'a' },
      { id: 'c', name: 'Carla', managerId: 'gone' },
      { id: 'd', name: 'Dario', managerId: 'b' },
    ];
    expect(shape(contactTree(odd))).toEqual([['a', [['b', ['d']]]], 'c']);
  });

  it('knows the reports and the managers of a person, and whom they can report to', () => {
    expect([...reportsOf(people, 'cto')].sort()).toEqual(['dev', 'qa']);
    expect(managersOf(people, 'qa').map((contact) => contact.id)).toEqual(['cto', 'ceo']);
    expect(managerChoices(people, 'cto').map((contact) => contact.id)).toEqual(['cfo', 'ceo']);
    expect(managerChoices(people, null)).toHaveLength(people.length);
  });
});

describe('searching the contacts', () => {
  const notes: ContactNote[] = [
    {
      id: 'n1',
      contactId: 'cfo',
      text: 'Chiede il **budget** a fine mese',
      createdAt: '2026-10-01T10:00:00Z',
    },
  ];

  it('finds people by name, role, team, email and notes, without accents or case', () => {
    const ids = (search: string, mode: 'all' | 'any' = 'all') =>
      filterContacts(people, notes, search, mode).map((contact) => contact.id);
    expect(ids('qualita')).toEqual(['qa']);
    expect(ids('responsabile')).toEqual(['cto']);
    expect(ids('prodotto')).toEqual(['dev']);
    expect(ids('example.com')).toEqual(['qa']);
    expect(ids('budget')).toEqual(['cfo']);
    expect(ids('budget prodotto', 'any')).toEqual(['cfo', 'dev']);
    expect(ids('')).toHaveLength(people.length);
  });

  it('keeps the managers of those found, so that the chart has their place', () => {
    const found = filterContacts(people, notes, 'sviluppo');
    expect(withManagers(people, found).map((contact) => contact.id)).toEqual(['ceo', 'cto', 'dev']);
  });
});

describe('changing the contacts', () => {
  const plan = { ...createEmptyPlan(), contacts: people };

  it('changes only what differs, and removes the blanks', () => {
    expect(diffContact(people[1]!, { name: 'Tecnologia ', role: '', managerId: 'ceo' })).toEqual({
      role: null,
    });
    const changed = updateContact(plan, 'qa', { email: null, team: 'Test' });
    expect(changed.contacts.find((contact) => contact.id === 'qa')).toEqual({
      id: 'qa',
      name: 'Qualità',
      managerId: 'cto',
      team: 'Test',
    });
  });

  it('moves up whoever reported to a removed person, and removes the notes on them', () => {
    const withNote = addContactNote(plan, {
      id: 'n1',
      contactId: 'cto',
      text: 'Nota',
      createdAt: '2026-10-01T10:00:00Z',
    });
    const removed = removeContact(withNote, 'cto');
    expect(removed.contacts.map((contact) => [contact.id, contact.managerId])).toEqual(
      expect.arrayContaining([
        ['dev', 'ceo'],
        ['qa', 'ceo'],
      ]),
    );
    expect(removed.contactNotes).toEqual([]);
    expect(shape(contactTree(removeContact(plan, 'ceo').contacts))).toEqual([
      'cfo',
      ['cto', ['qa', 'dev']],
    ]);
  });
});

describe('reading the contacts', () => {
  it('keeps what fits and refuses the rest', () => {
    expect(parseContact('p1', { name: 'Anna', role: 'Acquisti', email: '' })).toEqual({
      id: 'p1',
      name: 'Anna',
      role: 'Acquisti',
    });
    expect(parseContact('p1', { name: 'Anna', managerId: 'p1' })).toEqual({
      id: 'p1',
      name: 'Anna',
    });
    expect(parseContact('p1', { name: '' })).toBeNull();
    expect(parseContact('p1', { name: 'Anna', phone: 'x'.repeat(41) })).toBeNull();
    expect(
      parseContactNote('n1', {
        contactId: 'p1',
        text: 'Ciao',
        createdAt: '2026-10-01T10:00:00Z',
        author: { id: '1', login: 'owner' },
      }),
    ).toMatchObject({ author: { id: '1', login: 'owner' } });
    expect(
      parseContactNote('n1', { contactId: 'p1', text: ' ', createdAt: '2026-10-01T10:00' }),
    ).toBeNull();
  });
});
