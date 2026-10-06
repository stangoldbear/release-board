import { useId } from 'react';
import { FlaskConical } from 'lucide-react';

interface BetaSectionProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * The parts of the app still in development, off by default: who works on them turns them on in
 * their own browser, and everyone else keeps the finished page.
 */
export function BetaSection({ enabled, onChange }: BetaSectionProps) {
  const descriptionId = useId();
  return (
    <section aria-labelledby="settings-beta" className="space-y-2">
      <h3 id="settings-beta" className="text-sm font-bold">
        Funzioni beta
      </h3>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-2 text-sm hover:bg-surface-strong has-checked:border-accent has-checked:bg-accent-soft">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked)}
          // The label also holds the explanation, which belongs in the description only.
          aria-label="Attiva le funzioni beta"
          aria-describedby={descriptionId}
          className="mt-1"
        />
        <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-line-strong">
          <FlaskConical className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-semibold">Attiva le funzioni beta</span>
          <span id={descriptionId} className="block text-xs text-fg-muted">
            Mostra le parti ancora in sviluppo: per ora l'area Roadmap, con le sue impostazioni e la
            ricerca nei progetti. La scelta vale per questo browser; i dati del piano restano gli
            stessi per tutti.
          </span>
        </span>
      </label>
    </section>
  );
}
