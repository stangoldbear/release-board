import { useId, useState } from 'react';
import { ShieldAlert, Trash, UserMinus } from 'lucide-react';
import type { Member } from '../../app/MembersRepository';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';

/** Taking someone out of the plan, or taking the owner role from them. */
export type MemberChange = 'remove' | 'demote';

interface MemberChangeDialogProps {
  member: Member;
  change: MemberChange;
  /** `backup` when the user asked for a copy of the plan first. */
  onConfirm: (options: { backup: boolean }) => void;
  onCancel: () => void;
}

/**
 * Confirms a change that takes access away. Taking it from an owner asks to type their username,
 * as GitHub does before deleting a repository; removing someone also offers a backup first.
 */
export function MemberChangeDialog({
  member,
  change,
  onConfirm,
  onCancel,
}: MemberChangeDialogProps) {
  const owner = member.role === 'owner';
  const [typed, setTyped] = useState('');
  const [backup, setBackup] = useState(true);
  const inputId = useId();
  const hintId = useId();
  const confirmed = !owner || typed.trim().toLowerCase() === member.login.toLowerCase();

  const removing = change === 'remove';
  const title = removing
    ? owner
      ? 'Rimuovere un proprietario?'
      : 'Rimuovere il membro?'
    : 'Togliere il ruolo di proprietario?';
  const message = removing
    ? owner
      ? 'Non potrà più vedere né modificare il piano, né gestire i membri. Potrai invitare di nuovo la persona: rientrerà come editor.'
      : 'La persona non potrà più vedere né modificare il piano.'
    : 'Resterà nel piano come editor: vedrà e modificherà tutto, ma non potrà più invitare né rimuovere membri.';

  return (
    <Dialog
      title={title}
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
          {owner ? (
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Trash className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
      }
      onClose={onCancel}
      className="max-w-md"
      footer={
        <>
          <Button onClick={onCancel}>Annulla</Button>
          <Button
            variant="danger"
            disabled={!confirmed}
            onClick={() => onConfirm({ backup: removing && backup })}
          >
            {removing ? (
              <Trash className="h-4 w-4" aria-hidden="true" />
            ) : (
              <UserMinus className="h-4 w-4" aria-hidden="true" />
            )}
            {removing ? 'Rimuovi' : 'Rendi editor'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-fg-muted">{message}</p>
        <p className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-muted p-3 text-sm">
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-full"
            />
          ) : (
            <span className="h-7 w-7 rounded-full bg-surface-strong" aria-hidden="true" />
          )}
          <span className="min-w-0 flex-1 truncate font-semibold">{member.login}</span>
          <span className="text-xs text-fg-muted">{owner ? 'Proprietario' : 'Editor'}</span>
        </p>

        {owner && (
          <div>
            <label htmlFor={inputId} className={LABEL_CLASS}>
              Per confermare, scrivi lo username
            </label>
            <input
              id={inputId}
              data-autofocus
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby={hintId}
              className={`${FIELD_CLASS} font-mono`}
            />
            <p id={hintId} className="mt-1 text-xs text-fg-muted">
              Scrivi <strong className="font-mono text-fg">{member.login}</strong>: è un
              proprietario, e il pulsante si attiva solo così.
            </p>
          </div>
        )}

        {removing && (
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={backup}
              onChange={(event) => setBackup(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Scarica prima un backup di tutto il piano
              <span className="block text-xs text-fg-muted">
                Un file JSON con attività, note e valori, da ripristinare in Impostazioni → Backup.
              </span>
            </span>
          </label>
        )}
      </div>
    </Dialog>
  );
}
