import { apiClient } from './api-client';

// Types
export interface DashboardStats {
  workOrders: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
    completedThisWeek: number;
    completedThisMonth: number;
    avgCompletionTime: number; // hours
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalValue: number;
  };
  assets: {
    total: number;
    operational: number;
    underMaintenance: number;
    offline: number;
  };
  scheduling: {
    activeSchedules: number;
    upcomingMaintenance: number;
    overdueSchedules: number;
  };
}

export interface WorkOrderTrend {
  date: string;
  created: number;
  completed: number;
}

export interface WorkOrdersByPriority {
  priority: 'low' | 'medium' | 'high' | 'critical';
  count: number;
}

export interface WorkOrdersByType {
  type: 'reactive' | 'preventive' | 'predictive' | 'inspection';
  count: number;
}

export interface WorkOrdersByStatus {
  status: 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  count: number;
}

export interface TechnicianPerformance {
  userId: string;
  name: string;
  avatarUrl?: string;
  workOrdersCompleted: number;
  avgCompletionTime: number;
  hoursLogged: number;
}

export interface RecentActivity {
  id: string;
  type: 'work_order_created' | 'work_order_completed' | 'schedule_generated' | 'low_inventory' | 'asset_offline';
  title: string;
  description: string;
  timestamp: string;
  entityId?: string;
  entityType?: string;
}

export interface AssetHealth {
  assetId: string;
  name: string;
  assetTag: string;
  status: string;
  lastMaintenanceDate?: string;
  workOrdersThisMonth: number;
  healthScore: number; // 0-100
}

// API Functions
export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient.get('/dashboard/stats');
}

export async function getWorkOrderTrends(params: {
  period?: 'week' | 'month' | 'quarter' | 'year';
} = {}): Promise<WorkOrderTrend[]> {
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.set('period', params.period);
  const query = searchParams.toString();
  return apiClient.get(`/dashboard/work-order-trends${query ? `?${query}` : ''}`);
}

export async function getWorkOrdersByPriority(): Promise<WorkOrdersByPriority[]> {
  return apiClient.get('/dashboard/work-orders-by-priority');
}

export async function getWorkOrdersByType(): Promise<WorkOrdersByType[]> {
  return apiClient.get('/dashboard/work-orders-by-type');
}

export async function getWorkOrdersByStatus(): Promise<WorkOrdersByStatus[]> {
  return apiClient.get('/dashboard/work-orders-by-status');
}

export async function getTechnicianPerformance(params: {
  period?: 'week' | 'month' | 'quarter' | 'year';
  limit?: number;
} = {}): Promise<TechnicianPerformance[]> {
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.set('period', params.period);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  const query = searchParams.toString();
  return apiClient.get(`/dashboard/technician-performance${query ? `?${query}` : ''}`);
}

export async function getRecentActivity(params: {
  limit?: number;
} = {}): Promise<RecentActivity[]> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  const query = searchParams.toString();
  return apiClient.get(`/dashboard/recent-activity${query ? `?${query}` : ''}`);
}

export async function getAssetHealth(params: {
  limit?: number;
  sortBy?: 'healthScore' | 'workOrders' | 'lastMaintenance';
} = {}): Promise<AssetHealth[]> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  const query = searchParams.toString();
  return apiClient.get(`/dashboard/asset-health${query ? `?${query}` : ''}`);
}
