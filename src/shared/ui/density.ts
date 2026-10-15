/**
 * How close together the notes and the calendars are: «Large» with room around the boxes and taller
 * lines, «Standard» with tight lines and less room, and «Compatta», standard with the bars of the
 * people of a project thin and side by side, so that more projects fit at the Team level.
 */
export type Density = 'large' | 'standard' | 'compact';

export const DENSITIES: readonly { id: Density; label: string; description: string }[] = [
  {
    id: 'large',
    label: 'Large',
    description: 'Più spazio intorno alle caselle e righe più alte',
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Righe strette e meno spazio intorno: si legge più testo in ogni casella',
  },
  {
    id: 'compact',
    label: 'Compatta',
    description:
      'Come Standard, e a «Info principali» le barre delle persone sottili e attaccate, con nomi e giorni in piccolo',
  },
];

export const DENSITY_IDS: readonly Density[] = DENSITIES.map((density) => density.id);

export const DEFAULT_DENSITY: Density = 'standard';

/** Tight lines and less room around the boxes: every density but the large one. */
export function isTight(density: Density): boolean {
  return density !== 'large';
}
