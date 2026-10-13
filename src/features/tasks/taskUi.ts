import { Ban, CircleCheck, CircleDashed, CircleDot, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TaskStatus } from '../../domain/types';

/** A shape for each state of a task, so that the color of a bar is never the only cue. */
export const TASK_STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
  planned: CircleDashed,
  in_progress: CircleDot,
  review: Eye,
  completed: CircleCheck,
  blocked: Ban,
};

/** Plural labels, agreeing with "attività". */
export const TASK_STATUS_PLURALS: Record<TaskStatus, string> = {
  planned: 'Pianificate',
  in_progress: 'In corso',
  review: 'In revisione',
  completed: 'Completate',
  blocked: 'Bloccate',
};
