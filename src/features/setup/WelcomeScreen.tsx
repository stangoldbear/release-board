import { useState } from 'react';
import { Cloud, Laptop } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Screen } from '../../shared/ui/Screen';
import { SetupGuideDialog } from './SetupGuide';

interface WelcomeScreenProps {
  onTryLocal: () => void;
}

/** First screen of a copy that has no Firebase project: try locally, or set one up. */
export function WelcomeScreen({ onTryLocal }: WelcomeScreenProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <Screen
      title="Benvenuto"
      description="Calendario di rilasci e attività su corsie parallele, con note e valori giornalieri."
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={onTryLocal}
          className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-line p-4 text-left hover:bg-surface-strong"
        >
          <Laptop className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
          <span>
            <span className="block text-sm font-bold">Prova senza account</span>
            <span className="block text-xs text-fg-muted">
              I dati restano in questo browser. Puoi esportarli e importarli in un'istanza condivisa
              in seguito.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-accent bg-accent-soft p-4 text-left hover:bg-surface-strong"
        >
          <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-link" aria-hidden="true" />
          <span>
            <span className="block text-sm font-bold">Configura la tua istanza</span>
            <span className="block text-xs text-fg-muted">
              Un progetto Firebase per il team: accesso con GitHub, dati condivisi in tempo reale,
              anche offline.
            </span>
          </span>
        </button>
      </div>
      <p className="mt-5 text-center text-xs text-fg-muted">
        <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)}>
          Come funziona la configurazione
        </Button>
      </p>
      {guideOpen && <SetupGuideDialog onClose={() => setGuideOpen(false)} />}
    </Screen>
  );
}
