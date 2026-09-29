import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Screen } from '../../shared/ui/Screen';
import { SetupGuideDialog } from './SetupGuide';

interface SignInScreenProps {
  projectId: string;
  /** Resolves when the popup closes; rejects with a message for the person. */
  onSignIn: () => Promise<void>;
  onTryLocal: () => void;
}

export function SignInScreen({ projectId, onSignIn, onTryLocal }: SignInScreenProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSignIn();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Accesso non riuscito.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Accedi"
      description="Il piano è condiviso con i membri invitati dal proprietario. Entra con il tuo account GitHub."
    >
      <Button variant="primary" className="w-full" onClick={() => void signIn()} disabled={busy}>
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {busy ? 'Attendi la finestra di GitHub…' : 'Accedi con GitHub'}
      </Button>
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-danger bg-danger-soft p-3 text-xs">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-fg-muted">
        <Button variant="ghost" size="sm" onClick={onTryLocal}>
          Prova senza account
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)}>
          Guida alla configurazione
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-fg-muted">Progetto Firebase: {projectId}</p>
      {guideOpen && <SetupGuideDialog onClose={() => setGuideOpen(false)} />}
    </Screen>
  );
}
