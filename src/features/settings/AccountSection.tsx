import type { Role } from '../../app/MembersRepository';
import type { SignedInUser } from '../../app/Instance';
import { Button } from '../../shared/ui/Button';

const ROLE_LABELS: Record<Role, string> = { owner: 'Proprietario', editor: 'Editor' };

interface AccountSectionProps {
  user: SignedInUser;
  role: Role;
  planName: string;
  onSignOut: () => Promise<void>;
}

export function AccountSection({ user, role, planName, onSignOut }: AccountSectionProps) {
  return (
    <div className="flex items-center gap-3">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          referrerPolicy="no-referrer"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-full"
        />
      ) : (
        <span className="h-10 w-10 rounded-full bg-surface-strong" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="truncate font-semibold">{user.login}</p>
        <p className="truncate text-xs text-fg-muted">
          {ROLE_LABELS[role]} di «{planName}»
        </p>
      </div>
      <Button size="sm" onClick={() => void onSignOut()}>
        Esci
      </Button>
    </div>
  );
}
