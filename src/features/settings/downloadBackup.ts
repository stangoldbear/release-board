import { backupFileName, createBackupFile, serializeBackup } from '../../domain/backup';
import type { PlanSnapshot } from '../../domain/types';
import { downloadTextFile } from '../../utils/download';

/** Saves the whole plan as a backup file, named after today and the reason when there is one. */
export function downloadBackup(plan: PlanSnapshot, reason?: string): void {
  const now = new Date();
  downloadTextFile(
    backupFileName(now, reason),
    serializeBackup(createBackupFile(plan, now)),
    'application/json',
  );
}
