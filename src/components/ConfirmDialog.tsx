import { TriangleAlert, Trash } from 'lucide-react';
import { Dialog } from './Dialog';

export interface ConfirmDialogProps {
  title: string;
  message: string;
  itemTitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks to confirm an action. Mounted only while open. */
export function ConfirmDialog({
  title,
  message,
  itemTitle,
  confirmLabel = 'Elimina Definitivamente',
  cancelLabel = 'Annulla',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const VariantIcon = variant === 'danger' ? Trash : TriangleAlert;

  return (
    <Dialog
      title={title}
      icon={
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            variant === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          <VariantIcon className="w-5 h-5" aria-hidden="true" />
        </div>
      }
      onClose={onCancel}
      className="max-w-md"
      footer={
        <>
          <button
            id="cancel-confirm-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            id="action-confirm-btn"
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <Trash className="w-3.5 h-3.5" aria-hidden="true" />
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>

      {itemTitle && (
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 break-words flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span className="line-clamp-2">{itemTitle}</span>
        </div>
      )}
    </Dialog>
  );
}
