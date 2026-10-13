import { Copy } from 'lucide-react';
import { Button } from './Button';
import { useToast } from './Toast';

interface CopyButtonProps {
  /** What gets copied. */
  text: string;
  /** What the button says; defaults to "Copia". */
  label?: string;
  /** What the toast confirms, e.g. "Regole copiate". */
  confirmation?: string;
  /** The name of the button when several say the same, as "Copia la formula 0.12*QA". */
  ariaLabel?: string;
}

/** Puts a text in the clipboard and confirms it with a toast. */
export function CopyButton({
  text,
  label = 'Copia',
  confirmation = 'Copiato',
  ariaLabel,
}: CopyButtonProps) {
  const showToast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(confirmation);
    } catch {
      showToast('Copia non riuscita: seleziona il testo e copialo a mano');
    }
  };
  return (
    <Button size="sm" onClick={() => void copy()} aria-label={ariaLabel}>
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
