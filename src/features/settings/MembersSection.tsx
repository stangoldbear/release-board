import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Trash, UserPlus } from 'lucide-react';
import type { Member, MembersRepository, Role } from '../../app/MembersRepository';
import { isValidGitHubLogin } from '../../infra/github/users';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { FIELD_CLASS } from '../../shared/ui/field';
import { useToast } from '../../shared/ui/Toast';

interface MembersSectionProps {
  members: MembersRepository;
  /** The signed-in owner, who cannot change their own membership. */
  selfGithubId: string;
}

const INVITE_MESSAGES = {
  added: 'Invito registrato: al prossimo accesso la persona entra nel piano',
  'already-member': 'Questa persona è già tra i membri',
  'not-found': 'Nessun account GitHub con questo username',
};

/** Who can enter the plan. Owners invite by GitHub username, change roles and remove members. */
export function MembersSection({ members, selfGithubId }: MembersSectionProps) {
  const showToast = useToast();
  const [list, setList] = useState<Member[]>([]);
  const [login, setLogin] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);

  useEffect(() => members.subscribe(setList), [members]);

  const run = async (action: () => Promise<string | void>) => {
    setBusy(true);
    try {
      const message = await action();
      if (message) showToast(message);
    } catch (failure) {
      showToast(failure instanceof Error ? failure.message : 'Operazione non riuscita');
    } finally {
      setBusy(false);
    }
  };

  const invite = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = login.trim().replace(/^@/, '');
    if (!isValidGitHubLogin(trimmed)) {
      showToast('Scrivi uno username GitHub valido');
      return;
    }
    void run(async () => {
      const result = await members.invite(trimmed);
      if (result === 'added') setLogin('');
      return INVITE_MESSAGES[result];
    });
  };

  return (
    <section aria-labelledby="settings-members" className="space-y-3">
      <h3 id="settings-members" className="text-sm font-bold">
        Membri
      </h3>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {list.map((member) => {
          const self = member.githubId === selfGithubId;
          return (
            <li key={member.githubId} className="flex items-center gap-3 px-3 py-2 text-sm">
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
              <span className="min-w-0 flex-1 truncate font-medium">
                {member.login}
                {self && <span className="ml-1 text-xs text-fg-muted">(tu)</span>}
              </span>
              <select
                aria-label={`Ruolo di ${member.login}`}
                value={member.role}
                disabled={self || busy}
                onChange={(event) =>
                  void run(() => members.setRole(member.githubId, event.target.value as Role))
                }
                className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs text-fg"
              >
                <option value="owner">Proprietario</option>
                <option value="editor">Editor</option>
              </select>
              <Button
                variant="danger-subtle"
                size="icon"
                className="p-1.5"
                disabled={self || busy}
                onClick={() => setRemoving(member)}
                aria-label={`Rimuovi ${member.login}`}
              >
                <Trash className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
      <form onSubmit={invite} className="flex gap-2">
        <input
          type="text"
          aria-label="Username GitHub da invitare"
          placeholder="username GitHub"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          disabled={busy}
          className={`${FIELD_CLASS} flex-1 font-mono`}
        />
        <Button type="submit" disabled={busy || login.trim() === ''}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Invita
        </Button>
      </form>
      <p className="text-xs text-fg-muted">
        Gli invitati entrano come editor: vedono e modificano tutto, ma non i membri. Un
        proprietario può anche invitare e rimuovere.
      </p>
      {removing && (
        <ConfirmDialog
          title="Rimuovere il membro?"
          message="La persona non potrà più vedere né modificare il piano."
          itemTitle={removing.login}
          confirmLabel="Rimuovi"
          onConfirm={() => {
            const member = removing;
            setRemoving(null);
            void run(async () => {
              await members.remove(member.githubId);
              return `${member.login} non fa più parte del piano`;
            });
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </section>
  );
}
