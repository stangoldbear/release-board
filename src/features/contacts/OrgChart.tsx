import { MessageSquareText } from 'lucide-react';
import type { ContactNode } from '../../domain/contacts';
import type { Contact } from '../../domain/types';
import { CURRENT_RESULT, Highlight, useIsCurrentResult } from '../../shared/ui/Highlight';

/** The element of a person in the chart, to give it the focus or bring it into view. */
export function contactElementId(contactId: string): string {
  return `contact-${contactId}`;
}

/** How the chart is drawn: boxes under their managers, or a list indented by level. */
export type ContactsView = 'chart' | 'list';

interface ChartProps {
  nodes: readonly ContactNode[];
  view: ContactsView;
  /** How many notes each person has. */
  notesCount: (contactId: string) => number;
  /** While searching, the people found: their managers are drawn too, without the mark. */
  found: ReadonlySet<string> | null;
  onOpen: (contact: Contact) => void;
}

/** A person: a button that opens their window, with what a screen reader needs in its name. */
function ContactCard({
  node,
  view,
  notes,
  found,
  managerName,
  onOpen,
}: {
  node: ContactNode;
  view: ContactsView;
  notes: number;
  found: boolean;
  managerName: string | null;
  onOpen: () => void;
}) {
  const { contact, reports } = node;
  const current = useIsCurrentResult('contact', contact.id);
  const label = [
    contact.name,
    contact.role,
    contact.team,
    managerName ? `riporta a ${managerName}` : null,
    reports.length > 0
      ? `${reports.length} ${reports.length === 1 ? 'collaboratore' : 'collaboratori'}`
      : null,
    notes > 0 ? `${notes} ${notes === 1 ? 'nota' : 'note'}` : null,
    found ? 'trovato dalla ricerca' : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <button
      type="button"
      id={contactElementId(contact.id)}
      onClick={onOpen}
      aria-label={label}
      title={label}
      className={`relative flex min-w-0 cursor-pointer flex-col items-start rounded-lg border bg-surface px-3 py-2 text-left shadow-2xs hover:border-link hover:shadow-md ${
        view === 'chart' ? 'w-44' : 'w-full max-w-md'
      } ${found ? 'border-2 border-link' : 'border-line-strong'} ${current ? CURRENT_RESULT : ''}`}
    >
      <span className="w-full truncate text-sm font-bold">
        <Highlight text={contact.name} />
      </span>
      {contact.role && (
        <span className="w-full truncate text-xs">
          <Highlight text={contact.role} />
        </span>
      )}
      {contact.team && (
        <span className="w-full truncate text-xs text-fg-muted">
          <Highlight text={contact.team} />
        </span>
      )}
      {notes > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-xs text-fg-muted"
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          {notes}
        </span>
      )}
    </button>
  );
}

/** The lines of the chart, in the color of the borders of the controls (3:1 on the page). */
const LINE = 'before:border-line-strong after:border-line-strong';

function Branch({
  nodes,
  view,
  notesCount,
  found,
  onOpen,
  manager,
}: ChartProps & { manager: Contact | null }) {
  const top = manager === null;
  if (view === 'list') {
    return (
      <ul className={top ? 'space-y-2' : 'mt-2 space-y-2 border-l-2 border-line-strong pl-4'}>
        {nodes.map((node) => (
          <li key={node.contact.id}>
            <ContactCard
              node={node}
              view={view}
              notes={notesCount(node.contact.id)}
              found={found?.has(node.contact.id) ?? false}
              managerName={manager?.name ?? null}
              onOpen={() => onOpen(node.contact)}
            />
            {node.reports.length > 0 && (
              <Branch
                nodes={node.reports}
                view={view}
                notesCount={notesCount}
                found={found}
                onOpen={onOpen}
                manager={node.contact}
              />
            )}
          </li>
        ))}
      </ul>
    );
  }
  // The classic chart: a line down from the manager, one across the reports, one down to each.
  return (
    <ul
      className={`flex ${top ? 'gap-8' : `relative pt-4 before:absolute before:top-0 before:left-1/2 before:h-4 before:border-l-2 ${LINE}`}`}
    >
      {nodes.map((node) => (
        <li
          key={node.contact.id}
          className={`flex flex-col items-center ${
            top
              ? ''
              : `relative px-1.5 pt-4 before:absolute before:top-0 before:right-0 before:left-0 before:border-t-2 first:before:left-1/2 last:before:right-1/2 only:before:hidden after:absolute after:top-0 after:left-1/2 after:h-4 after:border-l-2 ${LINE}`
          }`}
        >
          <ContactCard
            node={node}
            view={view}
            notes={notesCount(node.contact.id)}
            found={found?.has(node.contact.id) ?? false}
            managerName={manager?.name ?? null}
            onOpen={() => onOpen(node.contact)}
          />
          {node.reports.length > 0 && (
            <Branch
              nodes={node.reports}
              view={view}
              notesCount={notesCount}
              found={found}
              onOpen={onOpen}
              manager={node.contact}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The organization chart: each person under whom they report to, in boxes joined by lines, or as
 * a list indented by level, which suits phones and reads the same. The chart scrolls sideways in
 * its own box, never the page. Every box is a button that opens the person.
 */
export function OrgChart(props: ChartProps) {
  return props.view === 'chart' ? (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface-muted p-4">
      {/* As wide as the chart, centered when it is narrower than the box. */}
      <div className="mx-auto w-max">
        <Branch {...props} manager={null} />
      </div>
    </div>
  ) : (
    <Branch {...props} manager={null} />
  );
}
