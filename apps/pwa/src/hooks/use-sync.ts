import { useEffect, useState, useCallback } from 'react';
import { syncService, type SyncResult } from '../lib/sync-service';

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Start sync service on mount
    syncService.start();

    return () => {
      // Stop sync service on unmount
      syncService.stop();
    };
  }, []);

  const manualSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncService.sync();
      setLastSyncResult(result);
      setLastSyncTime(new Date());
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isSyncing,
    lastSyncResult,
    lastSyncTime,
    manualSync,
  };
}
