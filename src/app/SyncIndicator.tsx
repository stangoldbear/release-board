import { CircleCheck, CloudOff, CloudUpload, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

/** The card's content: mounted when the card opens, so its time starts from that moment. */
function SyncDetails({ sync }: { sync: SyncState }) {
  const now = useNow(REFRESH_MS);
  const { text, Icon, tone, detail } = presentation(sync);
  return (
    <div className="space-y-2 text-xs">
      <p className={`flex items-center gap-1.5 text-sm font-bold ${tone}`}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {text}
      </p>
      <p className="text-fg-muted">{detail}</p>
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
    </div>
  );
}

interface SyncIndicatorProps {
  repository: PlanRepository;
  /** The parts of features this page hides: they do not count as missing. */
  hiddenParts?: readonly PlanPart[];
}

/**
 * The repository's synchronization state; hooks cannot subscribe conditionally, so this is its own
 * component. Resting on it, focusing it or tapping it shows when the plan was last synchronized.
 */
export function SyncIndicator({ repository, hiddenParts = [] }: SyncIndicatorProps) {
  const state = useSyncState(repository);
  const sync =
    hiddenParts.length === 0
      ? state
      : { ...state, missing: state.missing.filter((part) => !hiddenParts.includes(part)) };
  const { card, triggerProps, cardProps } = useHoverCard<true>();
  const { text, Icon, tone, announced } = presentation(sync);
  const when = sync.lastSyncedAt
    ? `Ultima sincronizzazione: ${formatDateTimeLongIT(sync.lastSyncedAt)}`
    : NEVER_SYNCED;

  return (
    <>
      {/* Only the status is announced, not the time, which changes with every update. */}
      <span role="status" className="sr-only">
        {text}
      </span>
      <button
        type="button"
        aria-label={`${text}. ${announced ? `${announced} ` : ''}${when}`}
        {...triggerProps(true)}
        className={`flex cursor-pointer items-center gap-1.5 rounded-md p-1 text-xs font-medium underline decoration-dotted underline-offset-4 hover:decoration-solid ${tone}`}
      >
        <Icon className="h-4 w-4 shrink-0 2xl:h-3.5 2xl:w-3.5" aria-hidden="true" />
        {/* Below 1536 pixels the icon alone, which differs by status; the name and the card say the rest. */}
        <span className="hidden 2xl:inline">{text}</span>
      </button>
      {card && (
        <HoverCard
          anchor={card.anchor}
          cardRef={cardProps.cardRef}
          onPointerEnter={cardProps.onPointerEnter}
          onPointerLeave={cardProps.onPointerLeave}
        >
          <SyncDetails sync={sync} />
        </HoverCard>
      )}
    </>
  );
}
