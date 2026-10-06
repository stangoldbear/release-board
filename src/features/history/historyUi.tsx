import {
  CalendarRange,
  ListTodo,
  Milestone,
  NotebookPen,
  Rows3,
  SlidersHorizontal,
  StickyNote,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { HistoryKind } from '../../domain/history';
import { addDaysIso, parseISODate } from '../../utils/dateUtils';

const KIND_ICONS: Record<HistoryKind, LucideIcon> = {
  task: ListTodo,
  note: StickyNote,
  memo: NotebookPen,
  project: Milestone,
  roadmap: SlidersHorizontal,
  revenue: TrendingUp,
  lane: Rows3,
  member: Users,
  plan: CalendarRange,
};

export function KindIcon({ kind, className }: { kind: HistoryKind; className?: string }) {
  const Icon = KIND_ICONS[kind];
  return <Icon className={className ?? 'h-4 w-4 shrink-0'} aria-hidden="true" />;
}

/** "lunedì 5 ottobre", or "Oggi" and "Ieri", with the year when it is not this year's. */
export function dayHeading(day: string, today: string): string {
  if (day === today) return 'Oggi';
  if (day === addDaysIso(today, -1)) return 'Ieri';
  const date = parseISODate(day);
  const text = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: day.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "5 ott". */
export function shortDay(day: string): string {
  return parseISODate(day).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

/** "14:32". */
export function timeOf(date: Date): string {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/** The GitHub picture of an account, from its numeric id. */
export function avatarUrl(githubId: string): string | null {
  return /^\d+$/.test(githubId) ? `https://avatars.githubusercontent.com/u/${githubId}?s=48` : null;
}
