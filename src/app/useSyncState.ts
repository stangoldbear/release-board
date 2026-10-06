import { useEffect, useState } from 'react';
import { INITIAL_SYNC } from './PlanRepository';
import type { PlanRepository, SyncState } from './PlanRepository';

/** The synchronization state of a repository, kept up to date. */
export function useSyncState(repository: PlanRepository): SyncState {
  const [sync, setSync] = useState<SyncState>(INITIAL_SYNC);
  useEffect(() => repository.subscribeSync(setSync), [repository]);
  return sync;
}
