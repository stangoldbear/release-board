import { Trash } from 'lucide-react';
import { Button } from './Button';
import { Dialog } from './Dialog';

export interface ConfirmDialogProps {
  title: string;
  message: string;
  itemTitle?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks to confirm a destructive action. Mounted only while open. */
export function ConfirmDialog({
  title,
  message,
  itemTitle,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      title={title}
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <Trash className="h-5 w-5" aria-hidden="true" />
        </div>
      }
      onClose={onCancel}
      className="max-w-md"
      footer={
        <>
          {/* The safe choice comes first. */}
          <Button onClick={onCancel} data-autofocus>
            Annulla
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            <Trash className="h-4 w-4" aria-hidden="true" />
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-fg-muted">{message}</p>
      {itemTitle && (
        <p className="mt-3 line-clamp-2 rounded-xl border border-line bg-surface-muted p-3 text-sm font-semibold break-words">
          {itemTitle}
        </p>
      )}
    </Dialog>
  );
}
