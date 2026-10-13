import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

/** How much an arrow key moves the edge of the column, in pixels at the normal size of the text. */
const KEY_STEP = 16;

interface ColumnHandleProps {
  /** The width of the column, in pixels at the normal size of the text, and its limits. */
  width: number;
  min: number;
  max: number;
  /** The size of the text: the column is drawn `width` times it. */
  scale: number;
  onChange: (width: number) => void;
  /** Back to the width of the app. */
  onReset: () => void;
}

/**
 * The edge of the column of the names, in the rows at the top: dragged with a mouse, a pen or a
 * finger it changes the width of the column; the arrows move it too, Home and End to its limits;
 * a double click puts it back. A splitter for the keyboard, with the width as its value.
 */
export function ColumnHandle({ width, min, max, scale, onChange, onReset }: ColumnHandleProps) {
  const start = useRef<{ x: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const clamp = (value: number) => Math.round(Math.min(max, Math.max(min, value)));

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, width };
    setDragging(true);
  };
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    onChange(clamp(start.current.width + (event.clientX - start.current.x) / scale));
  };
  const handlePointerEnd = () => {
    start.current = null;
    setDragging(false);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = {
      ArrowLeft: width - KEY_STEP,
      ArrowRight: width + KEY_STEP,
      Home: min,
      End: max,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(clamp(next));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Larghezza della colonna dei nomi"
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Trascina per cambiare la larghezza della colonna dei nomi; doppio clic per quella di serie"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      style={{ left: 'calc(var(--gantt-label-width) - 4px)' }}
      className={`absolute inset-y-0 z-[900] w-2 cursor-col-resize touch-none transition-colors ${
        dragging ? 'bg-link/40' : 'hover:bg-link/30 focus-visible:bg-link/30'
      }`}
    />
  );
}
