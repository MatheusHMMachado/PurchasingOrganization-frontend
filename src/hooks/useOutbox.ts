import { useEffect, useRef, useSyncExternalStore } from 'react';
import { outboxStore, type OutboxStatus } from '../offline/outbox';

export function useOutbox(): OutboxStatus {
  return useSyncExternalStore(outboxStore.subscribe, outboxStore.getSnapshot);
}

/** Calls `refetch` after a sync pushed queued writes, so temp ids/data are replaced by the server's. */
export function useRefetchOnSync(refetch: () => void) {
  const { syncVersion } = useOutbox();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncVersion]);
}
