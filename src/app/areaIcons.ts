import { CalendarRange, LayoutGrid, Milestone, NotebookPen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PageTab } from './layout';

/** The icon of each area, in the header's buttons and in the tabs; «All» has one of its own. */
export const AREA_ICONS: Record<PageTab, LucideIcon> = {
  all: LayoutGrid,
  notes: NotebookPen,
  releases: CalendarRange,
  roadmaps: Milestone,
};
