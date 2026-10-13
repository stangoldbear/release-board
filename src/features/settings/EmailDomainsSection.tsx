import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { MembersRepository } from '../../app/MembersRepository';
import { admitsEmail, parseEmailDomains } from '../../domain/emailDomains';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { FIELD_CLASS } from '../../shared/ui/field';
import { useToast } from '../../shared/ui/Toast';

interface EmailDomainsSectionProps {
  members: MembersRepository;
  /** The email of the owner's own account, which the list must keep admitting. */
  selfEmail: string | null;
  selfEmailVerified: boolean;
}

/** Why the owner's own account would not be admitted by these domains, or null when it would. */
function selfExclusion(
  domains: readonly string[],
  email: string | null,
  verified: boolean,
): string | null {
  if (admitsEmail(domains, email, verified)) return null;
  if (!email) {
    return "Il tuo account non porta un'email: con un limite sui domini perderesti anche tu l'accesso al piano.";
  }
  if (!verified) {
    return `L'email del tuo account, ${email}, non risulta verificata: con un limite sui domini perderesti anche tu l'accesso al piano.`;
  }
  return `La lista lascerebbe fuori anche te: aggiungi il dominio della tua email, ${email}.`;
}

/**
 * Admits only the accounts with a verified email of some domains, plan name included: a check
 * that the rules make on every request, on top of the list of members.
 */
export function EmailDomainsSection({
  members,
  selfEmail,
  selfEmailVerified,
}: EmailDomainsSectionProps) {
  const showToast = useToast();
  const fieldId = useId();
  const helpId = useId();
  const errorId = useId();
  const [domains, setDomains] = useState<string[] | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  useEffect(
    () =>
      members.subscribeDomains((next) => {
        setDomains(next);
        setDraft(next?.join(', ') ?? '');
      }),
    [members],
  );

  const save = async (next: string[] | null, message: string) => {
    setBusy(true);
    try {
      await members.setDomains(next);
      showToast(message);
    } catch {
      showToast('Domini non salvati: riprova');
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseEmailDomains(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const exclusion = selfExclusion(parsed.domains, selfEmail, selfEmailVerified);
    if (exclusion) {
      setError(exclusion);
      return;
    }
    setError(null);
    void save(parsed.domains, 'Domini ammessi salvati');
  };

  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <h4 className="flex items-center gap-1.5 text-xs font-bold">
        <ShieldCheck className="h-4 w-4 text-fg-muted" aria-hidden="true" />
        Domini email ammessi
      </h4>
      <p className="text-xs text-fg-muted">
        {domains
          ? `Entrano solo gli account con un'email verificata di ${domains.join(', ')}.`
          : 'Nessun limite: entra ogni account invitato, qualunque sia la sua email.'}
      </p>
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor={fieldId} className="sr-only">
          Domini email ammessi
        </label>
        <div className="flex gap-2">
          <input
            id={fieldId}
            type="text"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="esempio.com"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${errorId} ${helpId}` : helpId}
            className={`${FIELD_CLASS} flex-1 font-mono`}
          />
          <Button type="submit" disabled={busy || draft.trim() === ''}>
            {domains ? 'Salva' : 'Ammetti solo questi'}
          </Button>
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        )}
      </form>
      <p id={helpId} className="text-xs text-fg-muted">
        Vale per l&apos;email principale dell&apos;account GitHub, che deve essere verificata. Chi
        ha un&apos;email di altri domini non vede più nemmeno il nome del piano, anche se è tra i
        membri: l&apos;invito per username resta necessario. Più domini si separano con una virgola.
      </p>
      {domains && (
        <Button size="sm" disabled={busy} onClick={() => setConfirmingRemoval(true)}>
          Togli il limite
        </Button>
      )}
      {confirmingRemoval && (
        <ConfirmDialog
          title="Togliere il limite sui domini?"
          message="Ogni account invitato potrà di nuovo entrare nel piano, qualunque sia la sua email."
          confirmLabel="Togli il limite"
          onConfirm={() => {
            setConfirmingRemoval(false);
            void save(null, 'Limite sui domini tolto');
          }}
          onCancel={() => setConfirmingRemoval(false)}
        />
      )}
    </div>
  );
}
