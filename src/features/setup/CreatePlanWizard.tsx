import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { FileJson, Laptop, Sparkles } from 'lucide-react';
import { MAX_BACKUP_BYTES, parseBackupText } from '../../domain/backup';
import { createEmptyPlan, isPlanEmpty } from '../../domain/plan';
import type { PlanSnapshot } from '../../domain/types';
import { isValidGitHubLogin } from '../../infra/github/users';
import { Button } from '../../shared/ui/Button';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { Screen } from '../../shared/ui/Screen';

interface CreatePlanWizardProps {
  /** The GitHub username, when the sign-in told it; otherwise the person types it. */
  login: string | null;
  /** The plan saved in this browser, offered as a starting point when it has content. */
  localPlan: PlanSnapshot | null;
  /** Creates the plan and imports the content. Rejects with a message for the person. */
  onCreate: (name: string, login: string, plan: PlanSnapshot) => Promise<void>;
  onSignOut: () => Promise<void>;
}

type Source = 'empty' | 'local' | 'file';

function summary(plan: PlanSnapshot): string {
  const notes = Object.keys(plan.dailyNotes).length;
  return `${plan.lanes.length} corsie, ${plan.tasks.length} attività, ${plan.metrics.length} valori, ${notes} note`;
}

/** First access to a new instance: the person names the plan, picks its content and becomes owner. */
export function CreatePlanWizard({ login, localPlan, onCreate, onSignOut }: CreatePlanWizardProps) {
  const hasLocal = localPlan !== null && !isPlanEmpty(localPlan);
  const [name, setName] = useState('Piano rilasci');
  const [username, setUsername] = useState(login ?? '');
  const [source, setSource] = useState<Source>(hasLocal ? 'local' : 'empty');
  const [file, setFile] = useState<{ name: string; plan: PlanSnapshot } | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const cleanUsername = username.trim().replace(/^@/, '');
  // A username the sign-in told needs no typing, even when it arrives after the first render.
  const validUsername = login !== null || isValidGitHubLogin(cleanUsername);
  const chosenPlan: PlanSnapshot | null =
    source === 'empty' ? createEmptyPlan() : source === 'local' ? localPlan : (file?.plan ?? null);
  const canSubmit = !busy && chosenPlan !== null && name.trim() !== '' && validUsername;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) return;
    if (chosen.size > MAX_BACKUP_BYTES) {
      setFile(null);
      setFileErrors(['Il file è troppo grande per essere un backup.']);
      return;
    }
    const result = parseBackupText(await chosen.text());
    if (result.ok) {
      setFile({ name: chosen.name, plan: result.plan });
      setFileErrors([]);
    } else {
      setFile(null);
      setFileErrors(result.errors);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !chosenPlan) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(name.trim(), login ?? cleanUsername, chosenPlan);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Creazione non riuscita.');
      setBusy(false);
    }
  };

  const option = (
    value: Source,
    Icon: typeof Sparkles,
    title: string,
    detail: string,
    disabled = false,
  ) => (
    <label
      className={`flex items-start gap-3 rounded-xl border p-3 ${
        disabled ? 'opacity-50' : 'cursor-pointer hover:bg-surface-strong'
      } ${source === value ? 'border-accent bg-accent-soft' : 'border-line'}`}
    >
      <input
        type="radio"
        name="source"
        value={value}
        checked={source === value}
        disabled={disabled}
        onChange={() => setSource(value)}
        className="mt-1"
      />
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-fg-muted">{detail}</span>
      </span>
    </label>
  );

  return (
    <Screen
      title="Crea il piano"
      description={
        <>
          Sei il primo ad entrare in questa istanza{login && <strong>, {login}</strong>}: il piano
          che crei sarà tuo, e potrai invitare i colleghi da Impostazioni → Membri.
        </>
      }
      wide
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <div>
          <label htmlFor="plan-name" className={LABEL_CLASS}>
            Nome del piano
          </label>
          <input
            id="plan-name"
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        {login === null && (
          <div>
            <label htmlFor="plan-owner-login" className={LABEL_CLASS}>
              Il tuo username GitHub
            </label>
            <input
              id="plan-owner-login"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={username !== '' && !validUsername}
              className={`${FIELD_CLASS} font-mono`}
            />
            <p className="mt-1 text-xs text-fg-muted">
              Serve per riconoscerti nella lista dei membri: non è stato possibile leggerlo da
              GitHub.
            </p>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className={LABEL_CLASS}>Contenuto iniziale</legend>
          {option('empty', Sparkles, 'Piano vuoto', 'Tre corsie di esempio, nessuna attività.')}
          {option(
            'local',
            Laptop,
            'I dati di questo browser',
            hasLocal && localPlan ? summary(localPlan) : 'Questo browser non ha dati salvati.',
            !hasLocal,
          )}
          {option(
            'file',
            FileJson,
            'Un backup JSON',
            file
              ? `${file.name}: ${summary(file.plan)}`
              : 'Un file esportato da Impostazioni → Backup.',
          )}
          {source === 'file' && (
            <div className="ml-8 space-y-2">
              <Button size="sm" onClick={() => fileInput.current?.click()}>
                Scegli il file…
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => void handleFile(event)}
              />
              {fileErrors.length > 0 && (
                <ul className="list-disc rounded-lg border border-danger bg-danger-soft p-3 pl-7 text-xs">
                  {fileErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft p-3 text-xs">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={() => void onSignOut()} disabled={busy}>
            Esci
          </Button>
          <Button variant="primary" type="submit" disabled={!canSubmit}>
            {busy ? 'Creazione in corso…' : 'Crea il piano'}
          </Button>
        </div>
      </form>
    </Screen>
  );
}
