import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  Settings2,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { LoadingScreen } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { ConflictResolutionDialog } from '../../components/sync/conflict-resolution-dialog';
import { useConflicts } from '../../hooks/use-conflicts';
import type { ConflictItem } from '../../lib/conflict-resolution';
import { cn } from '../../lib/utils';

export function ConflictsPage() {
  const navigate = useNavigate();
  const { data: conflicts, isLoading, refetch } = useConflicts();
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null);

  if (isLoading) {
    return <LoadingScreen message="Loading sync conflicts..." />;
  }

  const conflictList = conflicts || [];

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'workOrder':
        return FileText;
      case 'asset':
        return Settings2;
      default:
        return AlertTriangle;
    }
  };

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case 'workOrder':
        return 'Work Order';
      case 'asset':
        return 'Asset';
      default:
        return entityType;
    }
  };

  const handleResolved = () => {
    setSelectedConflict(null);
    refetch();
  };

  if (selectedConflict) {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedConflict(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Resolve Conflict</h1>
        </div>
        <ConflictResolutionDialog
          conflict={selectedConflict}
          onResolved={handleResolved}
          onCancel={() => setSelectedConflict(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/settings' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Sync Conflicts</h1>
          <p className="text-sm text-muted-foreground">
            Resolve conflicts between local and server data
          </p>
        </div>
      </div>

      {/* Conflicts List */}
      {conflictList.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="No conflicts"
          description="All your data is in sync with the server"
          action={
            <Button variant="outline" onClick={() => navigate({ to: '/' })}>
              Go to Dashboard
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {conflictList.map((conflict) => {
            const Icon = getEntityIcon(conflict.entityType);
            const entityLabel = getEntityLabel(conflict.entityType);
            const title = (conflict.localData.title ||
              conflict.localData.name ||
              conflict.entityId) as string;

            return (
              <Card
                key={conflict.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedConflict(conflict)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      'bg-orange-500/10 text-orange-600'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning" className="text-xs">
                          {entityLabel}
                        </Badge>
                        {conflict.queueItemId && (
                          <Badge variant="destructive" className="text-xs">
                            Sync Failed
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium truncate mt-1">{title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(conflict.localUpdatedAt).toLocaleString()}
                        </span>
                        {conflict.fieldConflicts.length > 0 && (
                          <span>
                            {conflict.fieldConflicts.length} conflicting field{conflict.fieldConflicts.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">What are sync conflicts?</h4>
          <p className="text-sm text-muted-foreground">
            Conflicts occur when you make changes offline that conflict with changes
            made by others. You can choose to keep your local changes, accept the
            server version, or merge both versions field-by-field.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
