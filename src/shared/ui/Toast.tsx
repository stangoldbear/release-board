import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';

const TOAST_DURATION_MS = 3500;

const ToastContext = createContext<(message: string) => void>(() => {
  throw new Error('useToast needs a ToastProvider above it.');
});

/** Shows a short confirmation message; a new message replaces the current one. */
export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* The live region stays mounted so screen readers announce each new message; the key makes
          a repeated message count as new. */}
      <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50">
        {toast && (
          <div
            key={toast.id}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-xl"
          >
            <CircleCheck className="h-4 w-4 text-success" aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
