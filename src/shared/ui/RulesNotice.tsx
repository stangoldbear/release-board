import { TriangleAlert } from 'lucide-react';

/**
 * In place of a part of the plan that the published security rules do not know yet: what is
 * missing and who can bring it.
 */
export function RulesNotice({ what }: { what: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-warning bg-warning-soft p-3 text-xs text-fg">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <span>
        {what} non sono ancora disponibili in questa istanza: chi la gestisce deve pubblicare le
        regole di sicurezza aggiornate di Firestore.
      </span>
    </p>
  );
}
