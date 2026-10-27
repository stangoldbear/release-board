import { useId, useState } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { Eye } from 'lucide-react';
import { FIELD_CLASS } from './field';
import { Markdown } from './Markdown';

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> & {
  value: string;
  /** What the preview is of, for screen readers: the name of the field. */
  label: string;
};

/**
 * A text area that takes Markdown: under it, the marks it knows and a switch between writing and
 * the preview of the text as the notes show it. The area stays in the page while the preview is
 * shown, so that its label, its value and the form keep working.
 */
export function MarkdownTextarea({ value, label, className, rows = 3, ...props }: Props) {
  const [preview, setPreview] = useState(false);
  const hintId = useId();
  const describedBy = [props['aria-describedby'], hintId].filter(Boolean).join(' ');
  // The preview takes the height of the area, so that the window does not jump.
  const minHeight = `calc(${rows} * 1.5em + 1rem + 2px)`;
  return (
    <div>
      <textarea
        {...props}
        rows={rows}
        value={value}
        hidden={preview}
        aria-describedby={describedBy}
        className={className ?? FIELD_CLASS}
      />
      {preview && (
        <div
          role="region"
          aria-label={`Anteprima: ${label}`}
          style={{ minHeight }}
          className="rounded-lg border border-dashed border-line-strong bg-surface px-3 py-2 text-sm text-fg"
        >
          {value.trim() ? (
            <Markdown text={value} />
          ) : (
            <p className="text-fg-muted">Niente da mostrare.</p>
          )}
        </div>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p id={hintId} className="min-w-0 flex-1 text-xs text-fg-muted">
          Markdown: <span className="font-mono">**grassetto**</span>,{' '}
          <span className="font-mono">*corsivo*</span>, <span className="font-mono">- elenco</span>,{' '}
          <span className="font-mono">[link](https://…)</span>
        </p>
        <button
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview((shown) => !shown)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-link hover:bg-surface-strong aria-pressed:bg-accent-soft"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Anteprima
        </button>
      </div>
    </div>
  );
}
