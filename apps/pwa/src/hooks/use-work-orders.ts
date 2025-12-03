import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkOrders,
  getWorkOrder,
  createWorkOrder,
  updateWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  completeStep,
  uncompleteStep,
  addComment,
  updateComment,
  deleteComment,
  getActivityFeed,
  uploadPhoto,
  deletePhoto,
  updatePhotoCaption,
  addLaborEntry,
  updateLaborEntry,
  deleteLaborEntry,
  startLaborTimer,
  stopLaborTimer,
  addPart,
  updatePart,
  deletePart,
  returnPart,
  type CreateWorkOrderData,
  type UpdateWorkOrderData,
} from '../lib/work-orders-api';

// Query keys
export const workOrderKeys = {
  all: ['work-orders'] as const,
  lists: () => [...workOrderKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...workOrderKeys.lists(), filters] as const,
  details: () => [...workOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...workOrderKeys.details(), id] as const,
  activity: (id: string) => [...workOrderKeys.detail(id), 'activity'] as const,
};

// List work orders
export function useWorkOrders(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  assetId?: string;
} = {}) {
  return useQuery({
    queryKey: workOrderKeys.list(params),
    queryFn: () => getWorkOrders(params),
  });
}

// Get single work order
export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: workOrderKeys.detail(id),
    queryFn: () => getWorkOrder(id),
    enabled: !!id,
  });
}

// Create work order
export function useCreateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkOrderData) => createWorkOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    },
  });
}

// Update work order
export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkOrderData }) =>
      updateWorkOrder(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(workOrderKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    },
  });
}

// Start work order
export function useStartWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => startWorkOrder(id),
    onSuccess: (data) => {
      queryClient.setQueryData(workOrderKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    },
  });
}

// Complete work order
export function useCompleteWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { completionNotes?: string; actualHours?: number; expectedVersion: number };
    }) => completeWorkOrder(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(workOrderKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
    },
  });
}

// Complete step
export function useCompleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      stepId,
      data,
    }: {
      workOrderId: string;
      stepId: string;
      data: { completionNotes?: string };
    }) => completeStep(workOrderId, stepId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Uncomplete step
export function useUncompleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, stepId }: { workOrderId: string; stepId: string }) =>
      uncompleteStep(workOrderId, stepId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Add comment
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      data,
    }: {
      workOrderId: string;
      data: { content: string; parentId?: string; isInternal?: boolean };
    }) => addComment(workOrderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.activity(variables.workOrderId),
      });
    },
  });
}

// Update comment
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      commentId,
      data,
    }: {
      workOrderId: string;
      commentId: string;
      data: { content: string };
    }) => updateComment(workOrderId, commentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Delete comment
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, commentId }: { workOrderId: string; commentId: string }) =>
      deleteComment(workOrderId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.activity(variables.workOrderId),
      });
    },
  });
}

// Activity feed
export function useActivityFeed(workOrderId: string, params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: workOrderKeys.activity(workOrderId),
    queryFn: () => getActivityFeed(workOrderId, params),
    enabled: !!workOrderId,
  });
}

// Upload photo
export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      data,
    }: {
      workOrderId: string;
      data: { file: File; caption?: string; category?: string };
    }) => uploadPhoto(workOrderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Delete photo
export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, photoId }: { workOrderId: string; photoId: string }) =>
      deletePhoto(workOrderId, photoId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Update photo caption
export function useUpdatePhotoCaption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      photoId,
      caption,
    }: {
      workOrderId: string;
      photoId: string;
      caption: string;
    }) => updatePhotoCaption(workOrderId, photoId, caption),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Add labor entry
export function useAddLaborEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      data,
    }: {
      workOrderId: string;
      data: {
        startTime: string;
        endTime?: string;
        hours?: number;
        description?: string;
        laborType?: string;
      };
    }) => addLaborEntry(workOrderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Update labor entry
export function useUpdateLaborEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      entryId,
      data,
    }: {
      workOrderId: string;
      entryId: string;
      data: {
        startTime?: string;
        endTime?: string;
        hours?: number;
        description?: string;
        laborType?: string;
      };
    }) => updateLaborEntry(workOrderId, entryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Delete labor entry
export function useDeleteLaborEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, entryId }: { workOrderId: string; entryId: string }) =>
      deleteLaborEntry(workOrderId, entryId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Start labor timer
export function useStartLaborTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      data,
    }: {
      workOrderId: string;
      data: { description?: string; laborType?: string };
    }) => startLaborTimer(workOrderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Stop labor timer
export function useStopLaborTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, entryId }: { workOrderId: string; entryId: string }) =>
      stopLaborTimer(workOrderId, entryId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Add part
export function useAddPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      data,
    }: {
      workOrderId: string;
      data: {
        inventoryItemId?: string;
        partNumber?: string;
        partName: string;
        quantity: number;
        unitCost?: number;
        notes?: string;
      };
    }) => addPart(workOrderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Update part
export function useUpdatePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      partId,
      data,
    }: {
      workOrderId: string;
      partId: string;
      data: {
        quantity?: number;
        unitCost?: number;
        notes?: string;
        status?: 'used' | 'returned' | 'damaged';
      };
    }) => updatePart(workOrderId, partId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Delete part
export function useDeletePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workOrderId, partId }: { workOrderId: string; partId: string }) =>
      deletePart(workOrderId, partId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

// Return part
export function useReturnPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workOrderId,
      partId,
      data,
    }: {
      workOrderId: string;
      partId: string;
      data: { quantity: number; notes?: string };
    }) => returnPart(workOrderId, partId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}
