import { useState } from 'react';
import { Cloud } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { SetupGuideDialog } from '../setup/SetupGuide';

/** In local mode: where the data is, and how to move to a shared instance. */
export function InstanceSection({ onSignIn }: { onSignIn?: () => void }) {
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <section aria-labelledby="settings-instance" className="space-y-3">
      <h3 id="settings-instance" className="text-sm font-bold">
        Istanza condivisa
      </h3>
      <p className="text-xs text-fg-muted">
        I dati sono salvati solo in questo browser. Con un progetto Firebase il piano diventa
        condiviso con il team, in tempo reale e anche offline, con accesso tramite GitHub.
      </p>
      <div className="flex flex-wrap gap-2">
        {onSignIn && (
          <Button variant="primary" onClick={onSignIn}>
            Accedi all'istanza condivisa
          </Button>
        )}
        <Button onClick={() => setGuideOpen(true)}>
          <Cloud className="h-4 w-4" aria-hidden="true" />
          Come configurarla
        </Button>
      </div>
      {guideOpen && <SetupGuideDialog onClose={() => setGuideOpen(false)} />}
    </section>
  );
}
