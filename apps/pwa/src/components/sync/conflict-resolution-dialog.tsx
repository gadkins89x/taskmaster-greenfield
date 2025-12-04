import { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Server,
  Smartphone,
  ArrowRight,
  Check,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  useResolveConflict,
  useDiscardConflict,
} from '../../hooks/use-conflicts';
import type {
  ConflictItem,
  ResolutionStrategy,
  MergeResolution,
  FieldConflict,
} from '../../lib/conflict-resolution';
import { cn } from '../../lib/utils';

interface ConflictResolutionDialogProps {
  conflict: ConflictItem;
  onResolved: () => void;
  onCancel: () => void;
}

const fieldLabels: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  dueDate: 'Due Date',
  assignedToId: 'Assigned To',
  completionNotes: 'Completion Notes',
  name: 'Name',
  category: 'Category',
  serialNumber: 'Serial Number',
  manufacturer: 'Manufacturer',
  model: 'Model',
};

export function ConflictResolutionDialog({
  conflict,
  onResolved,
  onCancel,
}: ConflictResolutionDialogProps) {
  const [strategy, setStrategy] = useState<ResolutionStrategy | null>(null);
  const [mergeSelections, setMergeSelections] = useState<MergeResolution>({});
  const resolveMutation = useResolveConflict();
  const discardMutation = useDiscardConflict();

  const entityTypeLabel = conflict.entityType === 'workOrder' ? 'Work Order' : 'Asset';
  const hasFieldConflicts = conflict.fieldConflicts.length > 0;

  const handleFieldSelection = (field: string, source: 'local' | 'server') => {
    setMergeSelections(prev => ({ ...prev, [field]: source }));
  };

  const canResolve = () => {
    if (!strategy) return false;
    if (strategy === 'merge') {
      // All conflicting fields must have a selection
      return conflict.fieldConflicts.every(fc => mergeSelections[fc.field]);
    }
    return true;
  };

  const handleResolve = async () => {
    if (!strategy) return;

    try {
      await resolveMutation.mutateAsync({
        conflict,
        strategy,
        mergeResolution: strategy === 'merge' ? mergeSelections : undefined,
      });
      onResolved();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const handleDiscard = async () => {
    try {
      await discardMutation.mutateAsync(conflict);
      onResolved();
    } catch (error) {
      console.error('Failed to discard conflict:', error);
    }
  };

  const isPending = resolveMutation.isPending || discardMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Resolve Conflict</h2>
          <p className="text-sm text-muted-foreground">
            {entityTypeLabel}: {(conflict.localData.title || conflict.localData.name) as string}
          </p>
        </div>
      </div>

      {/* Version Info */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Local Version</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(conflict.localUpdatedAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <Server className="h-4 w-4 text-green-500" />
              <span className="font-medium">Server Version</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {conflict.serverUpdatedAt
                ? new Date(conflict.serverUpdatedAt).toLocaleString()
                : 'Deleted or unavailable'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Strategy Selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Choose resolution strategy:</p>
        <div className="grid gap-2">
          <Button
            variant={strategy === 'keep_local' ? 'default' : 'outline'}
            className="justify-start h-auto py-3"
            onClick={() => setStrategy('keep_local')}
          >
            <Smartphone className="mr-3 h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Keep Local Changes</div>
              <div className="text-xs text-muted-foreground">
                Overwrite server with your local changes
              </div>
            </div>
          </Button>

          {conflict.serverData && (
            <Button
              variant={strategy === 'keep_server' ? 'default' : 'outline'}
              className="justify-start h-auto py-3"
              onClick={() => setStrategy('keep_server')}
            >
              <Server className="mr-3 h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Keep Server Version</div>
                <div className="text-xs text-muted-foreground">
                  Discard local changes, use server data
                </div>
              </div>
            </Button>
          )}

          {hasFieldConflicts && conflict.serverData && (
            <Button
              variant={strategy === 'merge' ? 'default' : 'outline'}
              className="justify-start h-auto py-3"
              onClick={() => setStrategy('merge')}
            >
              <ArrowRight className="mr-3 h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Merge Changes</div>
                <div className="text-xs text-muted-foreground">
                  Choose field-by-field which version to keep
                </div>
              </div>
            </Button>
          )}
        </div>
      </div>

      {/* Field-by-field merge selection */}
      {strategy === 'merge' && hasFieldConflicts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Select values for each field</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflict.fieldConflicts.map((fc) => (
              <FieldConflictRow
                key={fc.field}
                conflict={fc}
                selected={mergeSelections[fc.field]}
                onSelect={(source) => handleFieldSelection(fc.field, source)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="ghost"
          onClick={handleDiscard}
          disabled={isPending}
          className="text-destructive hover:text-destructive"
        >
          {discardMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Discard
        </Button>
        <Button
          className="flex-1"
          onClick={handleResolve}
          disabled={!canResolve() || isPending}
        >
          {resolveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Resolve
        </Button>
      </div>
    </div>
  );
}

interface FieldConflictRowProps {
  conflict: FieldConflict;
  selected?: 'local' | 'server';
  onSelect: (source: 'local' | 'server') => void;
}

function FieldConflictRow({ conflict, selected, onSelect }: FieldConflictRowProps) {
  const label = fieldLabels[conflict.field] || conflict.field;

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelect('local')}
          className={cn(
            'rounded-lg border p-2 text-left text-xs transition-colors',
            selected === 'local'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/50'
          )}
        >
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Smartphone className="h-3 w-3" />
            Local
          </div>
          <div className="font-mono truncate">
            {formatValue(conflict.localValue)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSelect('server')}
          className={cn(
            'rounded-lg border p-2 text-left text-xs transition-colors',
            selected === 'server'
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-muted-foreground/50'
          )}
        >
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Server className="h-3 w-3" />
            Server
          </div>
          <div className="font-mono truncate">
            {formatValue(conflict.serverValue)}
          </div>
        </button>
      </div>
    </div>
  );
}
