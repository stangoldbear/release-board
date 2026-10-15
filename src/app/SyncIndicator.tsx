import {
  CircleCheck,
  CloudOff,
  CloudUpload,
  History,
  PencilLine,
  TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FocusEvent } from 'react';
import { Button } from '../shared/ui/Button';
import { HoverCard, useHoverCard } from '../shared/ui/HoverCard';
import { useNow } from '../shared/useNow';
import { formatDateTimeLongIT, timeAgo } from '../utils/dateUtils';
import { unavailableMessage } from './PlanRepository';
import type { PlanPart, PlanRepository, SyncState, SyncStatus } from './PlanRepository';
import { useSyncState } from './useSyncState';

const LABELS: Record<SyncStatus, { text: string; Icon: LucideIcon; tone: string; detail: string }> =
  {
    synced: {
      text: 'Sincronizzato',
      Icon: CircleCheck,
      tone: 'text-success',
      detail: 'Le modifiche sono salvate e quelle degli altri arrivano qui in tempo reale.',
    },
    saving: {
      text: 'Salvataggio…',
      Icon: CloudUpload,
      tone: 'text-link',
      detail: 'Le ultime modifiche stanno arrivando al server.',
    },
    offline: {
      text: 'In attesa di rete',
      Icon: CloudOff,
      tone: 'text-warning',
      detail: 'Le modifiche restano in questo browser e partono appena torna la connessione.',
    },
    error: {
      text: 'Errore',
      Icon: TriangleAlert,
      tone: 'text-danger',
      detail: 'Una modifica non è stata salvata.',
    },
  };

/** The parts the rules refuse are a limit of the page, not an error of the saving. */
const LIMITED = { text: 'Parti non disponibili', Icon: TriangleAlert, tone: 'text-warning' };

/** What the indicator shows, and the words it adds to its name when something is wrong. */
function presentation(sync: SyncState): {
  text: string;
  Icon: LucideIcon;
  tone: string;
  detail: string;
  announced: string;
} {
  if (sync.status !== 'error' && sync.missing.length > 0) {
    const detail = unavailableMessage(sync.missing);
    return { ...LIMITED, detail, announced: detail };
  }
  const { text, Icon, tone, detail } = LABELS[sync.status];
  const error = sync.status === 'error' ? sync.error : null;
  return { text, Icon, tone, detail: error ?? detail, announced: error ?? '' };
}

const NEVER_SYNCED = 'Nessuna sincronizzazione ancora';

/** How often the card refreshes "3 minuti fa" while it is open. */
const REFRESH_MS = 15_000;

/** The last change to the plan, as the indicator tells it. */
export interface LastChange {
  /** Who made it, in full, or the username when the name is not known. */
  name: string;
  /** Made by the signed-in member. */
  mine: boolean;
  /** "ha spostato la nota dal …", without who. */
  what: string;
  /** Null while the server has not confirmed it yet. */
  at: Date | null;
}

/** The card's content: mounted when the card opens, so its time starts from that moment. */
function SyncDetails({
  sync,
  lastChange,
  onOpenHistory,
}: {
  sync: SyncState;
  lastChange: LastChange | null;
  onOpenHistory: () => void;
}) {
  const now = useNow(REFRESH_MS);
  const { text, Icon, tone, detail } = presentation(sync);
  return (
    <div className="space-y-2 text-xs">
      <p className={`flex items-center gap-1.5 text-sm font-bold ${tone}`}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {text}
      </p>
      <p className="text-fg-muted">{detail}</p>
      {lastChange && (
        <div className="border-t border-line pt-2">
          <p className="text-fg-muted">Ultima modifica</p>
          <p className="text-sm font-semibold">
            {lastChange.name}
            {lastChange.mine && ' (tu)'}
          </p>
          <p className="wrap-break-word">{lastChange.what}</p>
          <p className="text-fg-muted first-letter:uppercase">
            {lastChange.at ? timeAgo(lastChange.at, now) : 'adesso'}
          </p>
        </div>
      )}
      <div className="border-t border-line pt-2">
        <p className="text-fg-muted">Ultima sincronizzazione</p>
        {sync.lastSyncedAt ? (
          <>
            <p className="text-sm font-semibold first-letter:uppercase">
              {timeAgo(sync.lastSyncedAt, now)}
            </p>
            <p className="first-letter:uppercase">{formatDateTimeLongIT(sync.lastSyncedAt)}</p>
          </>
        ) : (
          <p className="font-semibold">{NEVER_SYNCED} in questa sessione</p>
        )}
      </div>
      <Button size="sm" className="w-full" onClick={onOpenHistory}>
        <History className="h-3.5 w-3.5" aria-hidden="true" />
        Apri la cronologia
      </Button>
    </div>
  );
}

interface SyncIndicatorProps {
  repository: PlanRepository;
  /** The parts of features this page hides: they do not count as missing. */
  hiddenParts?: readonly PlanPart[];
  /** The last change to the plan; null until the history tells it. */
  lastChange: LastChange | null;
  /** Opens the page with every change to the plan. */
  onOpenHistory: () => void;
}

/**
 * The repository's synchronization state on a first line, and who made the last change to the
 * plan on a second; a click opens the history. Resting on it or focusing it shows a card with
 * the details: when the plan was last synchronized, the last change, and the history again.
 * Hooks cannot subscribe conditionally, so this is its own component.
 */
export function SyncIndicator({
  repository,
  hiddenParts = [],
  lastChange,
  onOpenHistory,
}: SyncIndicatorProps) {
  const state = useSyncState(repository);
  const sync =
    hiddenParts.length === 0
      ? state
      : { ...state, missing: state.missing.filter((part) => !hiddenParts.includes(part)) };
  const { card, triggerProps, cardProps, close } = useHoverCard<true>();
  const { text, Icon, tone, announced } = presentation(sync);
  const when = sync.lastSyncedAt
    ? `Ultima sincronizzazione: ${formatDateTimeLongIT(sync.lastSyncedAt)}`
    : NEVER_SYNCED;
  const changed = lastChange ? `Ultima modifica di ${lastChange.name}. ` : '';
  // The click opens the history, rather than pinning the card.
  const trigger = triggerProps(true);
  const openHistory = () => {
    close();
    onOpenHistory();
  };

  return (
    <>
      {/* Only the status is announced, not the time, which changes with every update. */}
      <span role="status" className="sr-only">
        {text}
      </span>
      <button
        type="button"
        aria-label={`${text}. ${announced ? `${announced} ` : ''}${changed}${when}. Apri la cronologia`}
        onPointerEnter={trigger.onPointerEnter}
        onPointerLeave={trigger.onPointerLeave}
        onFocus={trigger.onFocus}
        onBlur={(event: FocusEvent<HTMLButtonElement>) => {
          // The focus may move onto the card's own button.
          const next = event.relatedTarget;
          if (!(next instanceof Node && cardProps.cardRef.current?.contains(next)))
            trigger.onBlur();
        }}
        onClick={openHistory}
        className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md p-1 text-left text-xs hover:bg-surface-strong"
      >
        <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
        {/* Below 1024 pixels the icon alone, which differs by status; the name and the card say the rest. */}
        <span className="hidden min-w-0 flex-col leading-tight lg:flex">
          <span className={`font-semibold ${tone}`}>{text}</span>
          {lastChange && (
            <span className="flex min-w-0 items-center gap-1 text-fg-muted">
              <PencilLine className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="max-w-36 truncate">{lastChange.name}</span>
            </span>
          )}
        </span>
      </button>
      {card && (
        <HoverCard
          anchor={card.anchor}
          cardRef={cardProps.cardRef}
          onPointerEnter={cardProps.onPointerEnter}
          onPointerLeave={cardProps.onPointerLeave}
          label="Sincronizzazione e ultima modifica"
        >
          <SyncDetails sync={sync} lastChange={lastChange} onOpenHistory={openHistory} />
        </HoverCard>
      )}
    </>
  );
}
