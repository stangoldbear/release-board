import type { ReactNode } from 'react';
import { Diamond, TriangleAlert } from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../../domain/plan';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../../domain/projects';
import { FADED_STRIPES } from '../roadmaps/ProjectBar';
import { PROJECT_STATUS_ICONS } from '../roadmaps/projectUi';
import { ABSENCE_STRIPES } from '../roadmaps/WorkBar';
import { TASK_STATUS_ICONS, TASK_STATUS_PLURALS } from '../tasks/taskUi';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-bold tracking-wide text-fg-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-sm border border-line-strong bg-surface-muted px-1 font-sans text-xs font-semibold">
      {children}
    </kbd>
  );
}

function Sign({ children, label }: { children: ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex w-8 shrink-0 justify-center" aria-hidden="true">
        {children}
      </span>
      {label}
    </li>
  );
}

interface HelpPanelProps {
  /** Which parts the timeline shows: the help speaks of what is there. */
  releases: boolean;
  projects: boolean;
}

/** How the timeline is moved and read: gestures, keys, and what each shape and sign means. */
export function HelpPanel({ releases, projects }: HelpPanelProps) {
  return (
    <div className="space-y-3 text-xs leading-relaxed">
      <Section title="Mouse e dito">
        <ul className="list-disc space-y-0.5 pl-4">
          <li>
            Trascina {releases ? "un'attività" : ''}
            {releases && projects ? ', ' : ''}
            {projects ? 'un progetto, dal titolo,' : ''} o una nota per spostarli; dai bordi cambi
            le date
            {projects ? ', al livello Team i giorni uomo di una persona' : ''}.
          </li>
          <li>Un clic su un giorno vuoto aggiunge lì; un clic su una barra la apre.</li>
          {projects && <li>Doppio clic su una barra del lavoro per scrivere i giorni uomo.</li>}
          {projects && (
            <li>
              Sulla riga di un progetto, sotto il mouse: le righe da mostrare e, al livello Team,
              «Aggiungi una persona».
            </li>
          )}
          <li>
            <Key>Maiusc</Key> + rotellina scorre i giorni, <Key>Ctrl</Key> + rotellina cambia lo
            zoom; con un dito scorri, con due fai lo zoom.
          </li>
        </ul>
      </Section>
      <Section title="Tastiera">
        <ul className="list-disc space-y-0.5 pl-4">
          <li>
            <Key>←</Key> <Key>→</Key> spostano la barra col focus
            {releases ? ' di un giorno' : ''}
            {releases && projects ? ' (attività) o' : ''}
            {projects ? ' di una settimana (progetti)' : ''}; con <Key>Maiusc</Key> cambiano la
            fine.
          </li>
          {projects && (
            <li>
              <Key>Alt</Key> + <Key>↑</Key> <Key>↓</Key> spostano un progetto nell&apos;ordine delle
              righe.
            </li>
          )}
          <li>
            <Key>Invio</Key> apre, <Key>Esc</Key> annulla un trascinamento
            {releases ? ', il tasto menu mostra le altre azioni di un’attività' : ''}.
          </li>
        </ul>
      </Section>
      <Section title="Legenda">
        <ul className="space-y-1">
          {releases &&
            TASK_STATUSES.map((status) => {
              const Icon = TASK_STATUS_ICONS[status];
              return (
                <Sign key={status} label={`Attività ${TASK_STATUS_PLURALS[status].toLowerCase()}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="sr-only">{TASK_STATUS_LABELS[status]}</span>
                </Sign>
              );
            })}
          {projects &&
            PROJECT_STATUSES.map((status) => {
              const Icon = PROJECT_STATUS_ICONS[status];
              return (
                <Sign
                  key={status}
                  label={`Progetto: ${PROJECT_STATUS_LABELS[status].toLowerCase()}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Sign>
              );
            })}
          <Sign label="Oggi">
            <span className="block h-4 w-0.5 bg-link" />
          </Sign>
          <Sign label="Nota sulla timeline">
            <Diamond className="h-3.5 w-3.5" />
          </Sign>
          {projects && (
            <>
              <Sign label="Hard deadline superata: il segno dice di quanto e chi la supera">
                <span className="flex items-center gap-0.5">
                  <span className="block h-4 border-l-2 border-dashed border-danger" />
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger text-on-danger">
                    <TriangleAlert className="h-3 w-3" />
                  </span>
                </span>
              </Sign>
              <Sign label="Giorni del progetto senza lavoro">
                <span
                  className="block h-3 w-7 rounded-xs border border-line-strong bg-surface"
                  style={{ backgroundImage: FADED_STRIPES }}
                />
              </Sign>
              <Sign label="Assenza di una persona">
                <span
                  className="block h-3 w-7 rounded-xs border border-line-strong"
                  style={ABSENCE_STRIPES}
                />
              </Sign>
            </>
          )}
        </ul>
      </Section>
    </div>
  );
}
