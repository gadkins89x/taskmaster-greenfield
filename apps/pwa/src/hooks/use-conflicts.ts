import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConflictedItems,
  getConflictCount,
  resolveConflict,
  discardConflict,
  type ConflictItem,
  type ResolutionStrategy,
  type MergeResolution,
} from '../lib/conflict-resolution';

export const conflictKeys = {
  all: ['conflicts'] as const,
  list: () => [...conflictKeys.all, 'list'] as const,
  count: () => [...conflictKeys.all, 'count'] as const,
};

export function useConflicts() {
  return useQuery({
    queryKey: conflictKeys.list(),
    queryFn: getConflictedItems,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useConflictCount() {
  return useQuery({
    queryKey: conflictKeys.count(),
    queryFn: getConflictCount,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conflict,
      strategy,
      mergeResolution,
    }: {
      conflict: ConflictItem;
      strategy: ResolutionStrategy;
      mergeResolution?: MergeResolution;
    }) => resolveConflict(conflict, strategy, mergeResolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conflictKeys.all });
      // Also refresh related entity queries
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useDiscardConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: discardConflict,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conflictKeys.all });
    },
  });
}
