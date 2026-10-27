import { Check, List, Network, UserPlus } from 'lucide-react';
import { contactTree, withManagers } from '../../domain/contacts';
import type { Contact, ContactNote } from '../../domain/types';
import { Area } from '../../shared/ui/Area';
import { Button } from '../../shared/ui/Button';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import { SEGMENT, SEGMENTED, SEGMENT_OFF, SEGMENT_ON } from '../../shared/ui/segmented';
import { OrgChart } from './OrgChart';
import type { ContactsView } from './OrgChart';

const VIEWS: readonly { id: ContactsView; label: string; Icon: typeof List }[] = [
  { id: 'chart', label: 'Organigramma', Icon: Network },
  { id: 'list', label: 'Elenco', Icon: List },
];

/**
 * The area «Contatti» (0.21, beta): the organization chart of the company, built by hand, with
 * notes on every person. The search of the page finds people by name, role, team, how to reach
 * them and their notes, and the chart keeps their managers around them.
 */
export function ContactsArea({
  id,
  contacts,
  notes,
  found,
  unavailable,
  view,
  onViewChange,
  onOpen,
  onAdd,
}: {
  id: string;
  contacts: readonly Contact[];
  notes: readonly ContactNote[];
  /** While searching, the people found; null otherwise. */
  found: readonly Contact[] | null;
  /** The published rules do not know the contacts yet. */
  unavailable: boolean;
  view: ContactsView;
  onViewChange: (view: ContactsView) => void;
  onOpen: (contact: Contact) => void;
  onAdd: () => void;
}) {
  const shown = found ? withManagers(contacts, found) : contacts;
  const count = (contactId: string) => notes.filter((note) => note.contactId === contactId).length;
  return (
    <Area
      id={id}
      title="Contatti"
      actions={
        <>
          <span className="rounded-md border border-line-strong px-1.5 py-0.5 text-xs font-semibold text-fg-muted">
            Beta
          </span>
          {!unavailable && (
            <>
              <span className="text-xs text-fg-muted">
                {found
                  ? `${found.length} ${found.length === 1 ? 'persona trovata' : 'persone trovate'} su ${contacts.length}`
                  : `${contacts.length} ${contacts.length === 1 ? 'persona' : 'persone'}`}
              </span>
              <div role="group" aria-label="Vista dei contatti" className={`${SEGMENTED} ml-auto`}>
                {VIEWS.map(({ id: viewId, label, Icon }) => (
                  <button
                    key={viewId}
                    type="button"
                    aria-pressed={view === viewId}
                    onClick={() => onViewChange(viewId)}
                    className={`${SEGMENT} ${view === viewId ? SEGMENT_ON : SEGMENT_OFF}`}
                  >
                    {view === viewId ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {label}
                  </button>
                ))}
              </div>
              <Button variant="primary" onClick={onAdd}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Nuova persona
              </Button>
            </>
          )}
        </>
      }
    >
      {unavailable ? (
        <RulesNotice what="I contatti" />
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-strong p-6 text-sm">
          <p className="font-semibold">Nessuna persona, ancora.</p>
          <p className="mt-1 text-fg-muted">
            L’organigramma si costruisce a mano: aggiungi una persona, poi chi le riporta. Chi non
            riporta a nessuno sta in cima. Ogni persona ha le sue note, anche in Markdown.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-fg-muted">Nessuna persona trovata.</p>
      ) : (
        <OrgChart
          nodes={contactTree(shown)}
          view={view}
          notesCount={count}
          found={found ? new Set(found.map((contact) => contact.id)) : null}
          onOpen={onOpen}
        />
      )}
    </Area>
  );
}
