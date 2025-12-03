import { apiClient } from './api-client';

export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type SchedulePriority = 'low' | 'medium' | 'high' | 'critical';

export interface ScheduleStep {
  id: string;
  stepOrder: number;
  title: string;
  description?: string;
  isRequired: boolean;
}

export interface MaintenanceSchedule {
  id: string;
  name: string;
  description?: string;
  assetId?: string;
  locationId?: string;
  priority: SchedulePriority;
  estimatedHours?: number;
  assignedToId?: string;
  frequency: ScheduleFrequency;
  interval: number;
  daysOfWeek: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  startDate: string;
  endDate?: string;
  leadTimeDays: number;
  workOrderTitle: string;
  workOrderType: string;
  isActive: boolean;
  lastGeneratedAt?: string;
  nextDueDate?: string;
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: string;
    name: string;
    assetTag: string;
  };
  location?: {
    id: string;
    name: string;
    code: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    generatedWorkOrders: number;
  };
}

export interface ScheduleDetail extends MaintenanceSchedule {
  steps: ScheduleStep[];
  generatedWorkOrders: Array<{
    id: string;
    scheduledFor: string;
    workOrder: {
      id: string;
      workOrderNumber: string;
      status: string;
      completedAt?: string;
    };
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateScheduleData {
  name: string;
  description?: string;
  assetId?: string;
  locationId?: string;
  priority?: SchedulePriority;
  estimatedHours?: number;
  assignedToId?: string;
  frequency: ScheduleFrequency;
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  startDate: string;
  endDate?: string;
  leadTimeDays?: number;
  workOrderTitle: string;
  workOrderType?: string;
  steps?: Array<{
    stepOrder: number;
    title: string;
    description?: string;
    isRequired?: boolean;
  }>;
}

export interface UpdateScheduleData extends Partial<CreateScheduleData> {
  isActive?: boolean;
}

// API functions
export async function getSchedules(params: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  assetId?: string;
  locationId?: string;
} = {}): Promise<PaginatedResponse<MaintenanceSchedule>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());
  if (params.assetId) searchParams.set('assetId', params.assetId);
  if (params.locationId) searchParams.set('locationId', params.locationId);

  const query = searchParams.toString();
  return apiClient.get(`/schedules${query ? `?${query}` : ''}`);
}

export async function getSchedule(id: string): Promise<ScheduleDetail> {
  return apiClient.get(`/schedules/${id}`);
}

export async function getUpcomingSchedules(days: number = 30): Promise<MaintenanceSchedule[]> {
  return apiClient.get(`/schedules/upcoming?days=${days}`);
}

export async function createSchedule(data: CreateScheduleData): Promise<ScheduleDetail> {
  return apiClient.post('/schedules', data);
}

export async function updateSchedule(id: string, data: UpdateScheduleData): Promise<ScheduleDetail> {
  return apiClient.put(`/schedules/${id}`, data);
}

export async function deleteSchedule(id: string): Promise<{ success: boolean }> {
  return apiClient.delete(`/schedules/${id}`);
}

export async function generateWorkOrder(scheduleId: string): Promise<unknown> {
  return apiClient.post(`/schedules/${scheduleId}/generate`);
}
