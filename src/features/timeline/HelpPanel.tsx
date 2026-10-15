import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../../domain/plan';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../../domain/projects';
import { DiamondSymbol, FlagSymbol, PostitSymbol } from '../notes/noteSymbols';
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
  people: boolean;
}

/** How the timeline is moved and read: gestures, keys, and what each shape and sign means. */
export function HelpPanel({ releases, projects, people }: HelpPanelProps) {
  return (
    <div className="space-y-3 text-xs leading-relaxed">
      <Section title="Mouse e dito">
        <ul className="list-disc space-y-0.5 pl-4">
          <li>
            Trascina {releases ? "un'attività" : ''}
            {releases && projects ? ', ' : ''}
            {projects ? 'un progetto, dal titolo,' : ''} o una nota per spostarli; dai bordi cambi
            le date
            {projects ? ', a «Info principali» e Team i giorni uomo di una persona' : ''}.
          </li>
          <li>Un clic su un giorno vuoto aggiunge lì; un clic su una barra la apre.</li>
          {releases && (
            <li>
              Trascina il nome di una corsia per cambiarne l&apos;ordine; un&apos;attività passa a
              un&apos;altra corsia trascinandola in su o in giù. Le corsie si aggiungono e si
              rinominano da Impostazioni → Next Releases → Corsie.
            </li>
          )}
          {releases && (
            <li>
              Le note dei giorni stanno sotto le corsie di Next Releases e restano dentro il loro
              giorno: «Espandi», nella loro riga, ne mostra più righe; una nota che non ci sta
              intera si legge nella scheda che si apre fermandoci sopra il mouse, o con un clic.
            </li>
          )}
          {projects && <li>Doppio clic su una barra del lavoro per scrivere i giorni uomo.</li>}
          {projects && (
            <li>
              Clic su un giorno della riga «Giorno»: in fondo alla pagina, prima della versione, i
              giorni uomo di ogni team in quel giorno su tutti i progetti; un altro clic li toglie.
            </li>
          )}
          {projects && (
            <li>
              Il menu «Etichette» mostra solo i progetti con le etichette scelte; le etichette si
              danno nella finestra del progetto e si leggono nelle sue informazioni («i»).
            </li>
          )}
          {projects && (
            <li>
              Sulla riga di un progetto, sotto il mouse: «i» apre le informazioni del progetto in
              una finestra che si sposta dalla sua barra e si chiude con la X, poi a «Info
              principali» e Team «Aggiungi una persona» e le righe da mostrare.
            </li>
          )}
          {people && (
            <li>
              In «Persone» ogni persona ha una riga, con una barra per ogni progetto nel colore del
              progetto: trascinala di lato per spostarla nel tempo, su un&apos;altra persona per
              passarle il lavoro; il bordo destro cambia i giorni uomo. Le righe rosse in alto
              segnano i giorni con più progetti insieme.
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
            {projects ? ' di una settimana (progetti)' : ''}
            {releases ? (
              <>
                ; con <Key>Maiusc</Key> cambiano la fine di un&apos;attività
              </>
            ) : null}
            .
          </li>
          {people && (
            <li>
              In «Persone», <Key>Alt</Key> + <Key>↑</Key> <Key>↓</Key> passano il lavoro della barra
              col focus alla persona sopra o sotto.
            </li>
          )}
          {(projects || releases) && (
            <li>
              <Key>Alt</Key> + <Key>↑</Key> <Key>↓</Key> spostano
              {projects ? ' un progetto' : ''}
              {projects && releases ? ', o una corsia dalla sua maniglia,' : ''}
              {!projects && releases ? ' una corsia, dalla sua maniglia,' : ''} nell&apos;ordine
              delle righe.
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
          <Sign label="Festivo, o weekend se evidenziato">
            <span className="block h-3 w-7 rounded-xs border border-line-strong bg-holiday" />
          </Sign>
          <Sign label="Chiusura aziendale: nessuno lavora, come nel weekend">
            <span className="block h-3 w-7 rounded-xs border border-line-strong bg-closure" />
          </Sign>
          <Sign label="Nota sulla timeline: un clic su un giorno della riga ne aggiunge una">
            <DiamondSymbol colorId="yellow" size={14} />
          </Sign>
          <Sign label="Nota del giorno di Next Releases, nella riga «Note sulla timeline»">
            <FlagSymbol colorId="amber" size={16} />
          </Sign>
          <Sign label="Note di Notes con il promemoria in quel giorno: una pila se sono più di una">
            <PostitSymbol colorIds={['yellow', 'blue']} size={16} />
          </Sign>
          {people && (
            <Sign label="Giorni in cui una persona ha più progetti insieme">
              <span
                className="block h-1 w-7"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(135deg, var(--color-danger) 0 4px, transparent 4px 7px)',
                }}
              />
            </Sign>
          )}
          {(projects || people) && (
            <Sign label="Assenza di una persona">
              <span
                className="block h-3 w-7 rounded-xs border border-line-strong"
                style={ABSENCE_STRIPES}
              />
            </Sign>
          )}
          {projects && (
            <>
              <Sign label="Deadline superata: il segno dice di quanto e chi la supera">
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
            </>
          )}
        </ul>
      </Section>
    </div>
  );
}
