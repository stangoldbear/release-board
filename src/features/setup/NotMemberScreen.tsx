import { Button } from '../../shared/ui/Button';
import { CopyButton } from '../../shared/ui/CopyButton';
import { Screen } from '../../shared/ui/Screen';

interface NotMemberScreenProps {
  planName: string;
  login: string | null;
  /** Set when the plan could not be checked or read at all, rather than access being refused. */
  error?: string;
  onSignOut: () => Promise<void>;
}

/** Signed in, but not invited: the person needs the owner to add their GitHub username. */
export function NotMemberScreen({ planName, login, error, onSignOut }: NotMemberScreenProps) {
  return (
    <Screen
      title={error ? 'Accesso non riuscito' : 'Non sei ancora tra i membri'}
      description={
        error ?? (
          <>
            Il piano <strong>{planName || 'di questa istanza'}</strong> esiste già, ma il tuo
            account non è nella lista dei membri. Chiedi al proprietario di invitarti da
            Impostazioni → Membri con il tuo username GitHub.
          </>
        )
      }
    >
      {login && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          Il tuo username:{' '}
          <code className="rounded bg-surface-strong px-1.5 py-0.5 font-mono">{login}</code>
          <CopyButton text={login} confirmation="Username copiato" />
        </p>
      )}
      {!error && (
        <p className="text-xs text-fg-muted">
          Dopo l'invito ricarica la pagina. Il piano resta invisibile finché non sei membro.
        </p>
      )}
      <div className="mt-5 border-t border-line pt-4">
        <Button onClick={() => void onSignOut()}>Esci</Button>
      </div>
    </Screen>
  );
}
