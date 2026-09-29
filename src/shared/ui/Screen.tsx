import type { ReactNode } from 'react';
import { CalendarRange } from 'lucide-react';

interface ScreenProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Wider card, for forms with several steps. */
  wide?: boolean;
}

/** A page with one centered card: the screens shown before the calendar. */
export function Screen({ title, description, children, wide = false }: ScreenProps) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-canvas px-4 py-10 text-fg sm:justify-center">
      <div
        className={`w-full rounded-2xl border border-line bg-surface p-6 shadow-xs sm:p-8 ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-on-accent">
            <CalendarRange className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
              Release Board
            </p>
            <h1 className="text-lg leading-tight font-bold">{title}</h1>
          </div>
        </div>
        {description && <div className="mb-5 text-sm text-fg-muted">{description}</div>}
        {children}
      </div>
    </main>
  );
}

/** Text with a spinner, for the moments before something is ready. */
export function LoadingScreen({ message }: { message: string }) {
  return (
    <main
      role="status"
      className="flex min-h-screen items-center justify-center bg-canvas text-sm text-fg-muted"
    >
      <span className="mr-3 inline-block h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      {message}
    </main>
  );
}
