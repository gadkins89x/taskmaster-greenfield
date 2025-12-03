import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSchedules,
  getSchedule,
  getUpcomingSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  generateWorkOrder,
  type CreateScheduleData,
  type UpdateScheduleData,
} from '../lib/scheduling-api';

export const scheduleKeys = {
  all: ['schedules'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (filters: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    assetId?: string;
    locationId?: string;
  }) => [...scheduleKeys.lists(), filters] as const,
  details: () => [...scheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,
  upcoming: (days: number) => [...scheduleKeys.all, 'upcoming', days] as const,
};

export function useSchedules(filters: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  assetId?: string;
  locationId?: string;
} = {}) {
  return useQuery({
    queryKey: scheduleKeys.list(filters),
    queryFn: () => getSchedules(filters),
  });
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => getSchedule(id),
    enabled: !!id,
  });
}

export function useUpcomingSchedules(days: number = 30) {
  return useQuery({
    queryKey: scheduleKeys.upcoming(days),
    queryFn: () => getUpcomingSchedules(days),
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleData) => createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleData }) =>
      updateSchedule(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

export function useGenerateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) => generateWorkOrder(scheduleId),
    onSuccess: (_, scheduleId) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(scheduleId) });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    },
  });
}
