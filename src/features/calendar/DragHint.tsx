import type { ReactNode } from 'react';
import { MoveHorizontal } from 'lucide-react';

/** What a drag is about to do, at the bottom of the screen. */
export function DragHint({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-fg shadow-2xl">
      <MoveHorizontal className="h-4 w-4 text-link" aria-hidden="true" />
      <span>{children}</span>
      <span className="text-xs text-fg-muted">Esc annulla</span>
    </div>
  );
}
