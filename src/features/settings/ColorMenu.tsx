import { TASK_COLORS } from '../../domain/colors';
import type { TaskColorId } from '../../domain/colors';
import { Menu } from '../../shared/ui/Menu';
import type { MenuItem } from '../../shared/ui/Menu';
import { taskColorStyle } from '../../themes';

/**
 * A small rectangle in a color of the palette, as the tags and the bars draw it: fill and border.
 * Without a color, an empty dashed one. Decorative: the name of the color is always beside it.
 */
export function ColorSwatch({ colorId }: { colorId: TaskColorId | undefined }) {
  return (
    <span
      aria-hidden="true"
      style={colorId ? taskColorStyle(colorId) : undefined}
      className={`inline-block h-3.5 w-6 shrink-0 rounded-sm border-2 ${
        colorId ? '' : 'border-dashed border-line-strong bg-surface'
      }`}
    />
  );
}

const NO_COLOR = 'Nessun colore';

function colorName(colorId: TaskColorId | undefined, noneLabel: string): string {
  return TASK_COLORS.find((color) => color.id === colorId)?.name ?? noneLabel;
}

/**
 * The choice of a color of the palette, or none, as a menu: the button shows the color chosen,
 * its rectangle and its name, and every line of the list has its own rectangle.
 */
export function ColorMenu({
  label,
  value,
  onChange,
  noneLabel = NO_COLOR,
  allowNone = true,
}: {
  /** What the color is for, as «Colore di «Big project»»: the name of the menu. */
  label: string;
  value: TaskColorId | undefined;
  onChange: (colorId: TaskColorId | undefined) => void;
  /** What the choice without a color means, as «Il colore di ogni nota». */
  noneLabel?: string;
  /** Whether that choice is offered at all. */
  allowNone?: boolean;
}) {
  const none: MenuItem[] = allowNone
    ? [
        {
          kind: 'radio',
          label: noneLabel,
          leading: <ColorSwatch colorId={undefined} />,
          checked: value === undefined,
          onSelect: () => onChange(undefined),
        },
        { kind: 'separator' },
      ]
    : [];
  const items: MenuItem[] = [
    ...none,
    ...TASK_COLORS.map((color): MenuItem => ({
      kind: 'radio',
      label: color.name,
      leading: <ColorSwatch colorId={color.id} />,
      checked: value === color.id,
      onSelect: () => onChange(color.id),
    })),
  ];
  return (
    <Menu
      label={label}
      items={items}
      aria-label={`${label}: ${colorName(value, noneLabel)}`}
      className="gap-1.5 text-xs"
    >
      <ColorSwatch colorId={value} />
      <span>{colorName(value, noneLabel)}</span>
    </Menu>
  );
}
