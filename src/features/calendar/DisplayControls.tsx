import { useState } from 'react';
import { FoldVertical, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { DENSITIES } from '../../shared/ui/density';
import type { Density } from '../../shared/ui/density';
import { Menu } from '../../shared/ui/Menu';
import { TEXT_SCALES } from '../../shared/ui/textScale';
import type { TextScale } from '../../shared/ui/textScale';

interface TextSizeControlsProps {
  textScale: TextScale;
  onChange: (scale: TextScale) => void;
}

/**
 * The magnifiers that make the text of the notes and the calendars bigger or smaller, with the
 * current size between them: pressing it goes back to the normal size. Header, buttons and windows
 * keep theirs. At the ends the buttons do nothing but keep the focus, and the new size is
 * announced.
 */
export function TextSizeControls({ textScale, onChange }: TextSizeControlsProps) {
  const [announcement, setAnnouncement] = useState('');
  const index = TEXT_SCALES.indexOf(textScale);
  const smaller = TEXT_SCALES[index - 1];
  const bigger = TEXT_SCALES[index + 1];
  const percent = `${Math.round(textScale * 100)}%`;
  const change = (scale: TextScale | undefined) => {
    if (scale === undefined || scale === textScale) return;
    onChange(scale);
    setAnnouncement(`Testo di note e calendari al ${Math.round(scale * 100)}%`);
  };
  return (
    <div
      role="group"
      aria-label="Testo di note e calendari"
      className="relative flex items-center gap-0.5 rounded-xl border border-line bg-surface-strong p-1"
    >
      <Button
        variant="ghost"
        size="icon"
        className="p-1.5 aria-disabled:cursor-default aria-disabled:opacity-50"
        aria-disabled={smaller === undefined}
        onClick={() => change(smaller)}
        aria-label="Testo più piccolo"
        title="Testo di note e calendari più piccolo"
      >
        <ZoomOut className="h-4 w-4" aria-hidden="true" />
      </Button>
      <button
        type="button"
        onClick={() => change(1)}
        aria-disabled={textScale === 1}
        aria-label={textScale === 1 ? 'Testo al 100%' : `Testo al ${percent}: torna al 100%`}
        title={textScale === 1 ? 'Dimensione normale' : 'Torna alla dimensione normale'}
        className="min-w-11 cursor-pointer rounded-lg px-1 py-1.5 text-center text-xs font-semibold text-fg tabular-nums hover:bg-surface aria-disabled:cursor-default aria-disabled:hover:bg-transparent"
      >
        {percent}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="p-1.5 aria-disabled:cursor-default aria-disabled:opacity-50"
        aria-disabled={bigger === undefined}
        onClick={() => change(bigger)}
        aria-label="Testo più grande"
        title="Testo di note e calendari più grande"
      >
        <ZoomIn className="h-4 w-4" aria-hidden="true" />
      </Button>
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

/**
 * The density of the notes and the calendars, a menu of three: the button names the current one,
 * the menu marks it, and each line says what it changes.
 */
export function DensityMenu({
  density,
  onChange,
}: {
  density: Density;
  onChange: (density: Density) => void;
}) {
  const current = DENSITIES.find((item) => item.id === density) ?? DENSITIES[0]!;
  return (
    <Menu
      label="Densità"
      title="Densità di note e calendari"
      items={DENSITIES.map((item) => ({
        kind: 'radio' as const,
        label: item.label,
        hint: item.description,
        checked: item.id === density,
        onSelect: () => onChange(item.id),
      }))}
      className="rounded-xl"
    >
      <FoldVertical className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Densità: </span>
      {current.label}
    </Menu>
  );
}
