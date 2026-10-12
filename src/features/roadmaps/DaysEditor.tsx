import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { formatDays, parseDays } from './teamEffort';

interface DaysEditorProps {
  value: number;
  /** The accessible name of the field: whose days they are. */
  label: string;
  /** Where the editor sits over its bar. */
  style: CSSProperties;
  onSave: (manDays: number) => void;
  onCancel: () => void;
}

/**
 * The days of a bar, typed in place after a double click: Enter or leaving the field saves them,
 * in half days; Esc, a blank or a number that is not days leaves them as they were.
 */
export function DaysEditor({ value, label, style, onSave, onCancel }: DaysEditorProps) {
  const [text, setText] = useState(formatDays(value));
  const input = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    const days = parseDays(text);
    if (save && days !== null && days !== value) onSave(days);
    else onCancel();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        finish(true);
      }}
      // A press here must not start a drag of the bar underneath.
      onPointerDown={(event) => event.stopPropagation()}
      style={style}
      className="pointer-events-auto absolute z-[1000] flex items-center gap-1 rounded-xs border-2 border-link bg-surface px-1 text-fg shadow-lg"
    >
      <input
        ref={input}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            finish(false);
          }
        }}
        onBlur={() => finish(true)}
        aria-label={label}
        aria-invalid={(text.trim() !== '' && parseDays(text) === null) || undefined}
        className="w-12 min-w-0 bg-transparent text-right text-xs tabular-nums outline-none"
      />
      <span className="text-xs text-fg-muted">gg</span>
    </form>
  );
}
