import { useEffect, useState } from 'react';
import { CircleCheck, CloudOff, CloudUpload, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PlanRepository, SyncStatus } from './PlanRepository';

const LABELS: Record<SyncStatus, { text: string; Icon: LucideIcon; tone: string }> = {
  synced: { text: 'Sincronizzato', Icon: CircleCheck, tone: 'text-success' },
  saving: { text: 'Salvataggio…', Icon: CloudUpload, tone: 'text-link' },
  offline: { text: 'In attesa di rete', Icon: CloudOff, tone: 'text-warning' },
  error: { text: 'Errore', Icon: TriangleAlert, tone: 'text-danger' },
};

/** The repository's status; hooks cannot subscribe conditionally, so this is its own component. */
export function SyncIndicator({ repository }: { repository: PlanRepository }) {
  const [status, setStatus] = useState<SyncStatus>('synced');
  useEffect(() => repository.subscribeStatus(setStatus), [repository]);
  const { text, Icon, tone } = LABELS[status];
  const detail = 'error' in repository ? (repository as { error: string | null }).error : null;
  return (
    <span
      role="status"
      title={status === 'error' && detail ? detail : undefined}
      className={`flex items-center gap-1.5 text-xs font-medium ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}
