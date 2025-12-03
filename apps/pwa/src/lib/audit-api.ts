import { apiClient } from './api-client';

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  changes?: Record<string, unknown>;
  user: {
    id: string;
    name: string;
  } | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
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

export interface EntityTypeCount {
  entityType: string;
  count: number;
}

export interface AuditStats {
  period: 'day' | 'week' | 'month';
  totalEvents: number;
  byAction: Array<{ action: string; count: number }>;
  byEntityType: Array<{ entityType: string; count: number }>;
}

// API Functions
export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<PaginatedResponse<AuditLogEntry>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.entityType) searchParams.set('entityType', params.entityType);
  if (params.entityId) searchParams.set('entityId', params.entityId);
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.action) searchParams.set('action', params.action);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);

  const query = searchParams.toString();
  return apiClient.get(`/audit${query ? `?${query}` : ''}`);
}

export async function getEntityAuditLogs(
  entityType: string,
  entityId: string
): Promise<AuditLogEntry[]> {
  return apiClient.get(`/audit/entity/${entityType}/${entityId}`);
}

export async function getAuditEntityTypes(): Promise<EntityTypeCount[]> {
  return apiClient.get('/audit/entity-types');
}

export async function getAuditStats(
  period?: 'day' | 'week' | 'month'
): Promise<AuditStats> {
  const query = period ? `?period=${period}` : '';
  return apiClient.get(`/audit/stats${query}`);
}
