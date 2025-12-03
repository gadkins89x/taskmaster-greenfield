import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useConflictCount } from '../../hooks/use-conflicts';
import { syncService } from '../../lib/sync-service';
import { cn } from '../../lib/utils';

export function SyncStatusIndicator() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null);

  const { data: conflictCount = 0 } = useConflictCount();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await syncService.sync();
      setLastSyncResult(result.success ? 'success' : 'error');
    } catch {
      setLastSyncResult('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Conflict Badge */}
      {conflictCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={() => navigate({ to: '/sync/conflicts' })}
        >
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
          >
            {conflictCount}
          </Badge>
        </Button>
      )}

      {/* Sync Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualSync}
        disabled={isSyncing || !isOnline}
        className={cn(
          'gap-1.5',
          lastSyncResult === 'success' && 'text-green-600',
          lastSyncResult === 'error' && 'text-red-600'
        )}
      >
        {isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : isOnline ? (
          lastSyncResult === 'success' ? (
            <Check className="h-4 w-4" />
          ) : (
            <Cloud className="h-4 w-4" />
          )
        ) : (
          <CloudOff className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-xs hidden sm:inline">
          {isSyncing
            ? 'Syncing...'
            : isOnline
            ? lastSyncResult === 'success'
              ? 'Synced'
              : 'Sync'
            : 'Offline'}
        </span>
      </Button>
    </div>
  );
}
