import { useQuery } from '@tanstack/react-query';
import {
  getDashboardStats,
  getWorkOrderTrends,
  getWorkOrdersByPriority,
  getWorkOrdersByType,
  getWorkOrdersByStatus,
  getTechnicianPerformance,
  getRecentActivity,
  getAssetHealth,
} from '../lib/dashboard-api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  trends: (period: string) => [...dashboardKeys.all, 'trends', period] as const,
  byPriority: () => [...dashboardKeys.all, 'by-priority'] as const,
  byType: () => [...dashboardKeys.all, 'by-type'] as const,
  byStatus: () => [...dashboardKeys.all, 'by-status'] as const,
  technicianPerformance: (period: string) =>
    [...dashboardKeys.all, 'technician-performance', period] as const,
  recentActivity: () => [...dashboardKeys.all, 'recent-activity'] as const,
  assetHealth: () => [...dashboardKeys.all, 'asset-health'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStats,
    staleTime: 60000, // 1 minute
  });
}

export function useWorkOrderTrends(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  return useQuery({
    queryKey: dashboardKeys.trends(period),
    queryFn: () => getWorkOrderTrends({ period }),
    staleTime: 60000,
  });
}

export function useWorkOrdersByPriority() {
  return useQuery({
    queryKey: dashboardKeys.byPriority(),
    queryFn: getWorkOrdersByPriority,
    staleTime: 60000,
  });
}

export function useWorkOrdersByType() {
  return useQuery({
    queryKey: dashboardKeys.byType(),
    queryFn: getWorkOrdersByType,
    staleTime: 60000,
  });
}

export function useWorkOrdersByStatus() {
  return useQuery({
    queryKey: dashboardKeys.byStatus(),
    queryFn: getWorkOrdersByStatus,
    staleTime: 60000,
  });
}

export function useTechnicianPerformance(
  period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  limit: number = 10
) {
  return useQuery({
    queryKey: dashboardKeys.technicianPerformance(period),
    queryFn: () => getTechnicianPerformance({ period, limit }),
    staleTime: 60000,
  });
}

export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(),
    queryFn: () => getRecentActivity({ limit }),
    staleTime: 30000, // 30 seconds for more real-time feel
  });
}

export function useAssetHealth(limit: number = 10) {
  return useQuery({
    queryKey: dashboardKeys.assetHealth(),
    queryFn: () => getAssetHealth({ limit, sortBy: 'healthScore' }),
    staleTime: 60000,
  });
}
