import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(ctx: TenantContext) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel for performance
    const [
      workOrderStats,
      completedThisWeek,
      completedThisMonth,
      avgCompletionTime,
      inventoryStats,
      assetStats,
      schedulingStats,
    ] = await Promise.all([
      // Work order counts by status
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where: { tenantId: ctx.tenantId },
        _count: { id: true },
      }),
      // Completed this week
      this.prisma.workOrder.count({
        where: {
          tenantId: ctx.tenantId,
          status: 'completed',
          completedAt: { gte: startOfWeek },
        },
      }),
      // Completed this month
      this.prisma.workOrder.count({
        where: {
          tenantId: ctx.tenantId,
          status: 'completed',
          completedAt: { gte: startOfMonth },
        },
      }),
      // Average completion time (in hours)
      this.prisma.workOrder.aggregate({
        where: {
          tenantId: ctx.tenantId,
          status: 'completed',
          startedAt: { not: null },
          completedAt: { not: null },
        },
        _avg: { actualHours: true },
      }),
      // Inventory stats
      this.getInventoryStats(ctx.tenantId),
      // Asset stats
      this.getAssetStats(ctx.tenantId),
      // Scheduling stats
      this.getSchedulingStats(ctx.tenantId),
    ]);

    // Process work order stats
    const woStatusMap: Record<string, number> = {};
    let totalWorkOrders = 0;
    for (const stat of workOrderStats) {
      woStatusMap[stat.status] = stat._count.id;
      totalWorkOrders += stat._count.id;
    }

    // Count overdue work orders
    const overdueCount = await this.prisma.workOrder.count({
      where: {
        tenantId: ctx.tenantId,
        status: { in: ['open', 'in_progress', 'on_hold'] },
        dueDate: { lt: now },
      },
    });

    return {
      workOrders: {
        total: totalWorkOrders,
        open: woStatusMap['open'] ?? 0,
        inProgress: woStatusMap['in_progress'] ?? 0,
        completed: woStatusMap['completed'] ?? 0,
        overdue: overdueCount,
        completedThisWeek,
        completedThisMonth,
        avgCompletionTime: avgCompletionTime._avg.actualHours ?? 0,
      },
      inventory: inventoryStats,
      assets: assetStats,
      scheduling: schedulingStats,
    };
  }

  private async getInventoryStats(tenantId: string) {
    const [items, lowStockResult, outOfStock, totalValue] = await Promise.all([
      this.prisma.inventoryItem.count({
        where: { tenantId, isActive: true },
      }),
      // Use raw query to compare current_stock with reorder_point field
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM inventory_items
        WHERE tenant_id = ${tenantId}::uuid
          AND is_active = true
          AND current_stock <= reorder_point
      `,
      this.prisma.inventoryItem.count({
        where: { tenantId, isActive: true, currentStock: 0 },
      }),
      this.prisma.inventoryItem.aggregate({
        where: { tenantId, isActive: true },
        _sum: {
          currentStock: true,
        },
      }),
    ]);
    const lowStock = Number(lowStockResult[0]?.count ?? 0);

    // Calculate total value with a raw query for multiplication
    const valueResult = await this.prisma.$queryRaw<[{ total: number | null }]>`
      SELECT COALESCE(SUM(current_stock * COALESCE(unit_cost, 0)), 0)::float as total
      FROM inventory_items
      WHERE tenant_id = ${tenantId}::uuid AND is_active = true
    `;

    return {
      totalItems: items,
      lowStockItems: lowStock,
      outOfStockItems: outOfStock,
      totalValue: valueResult[0]?.total ?? 0,
    };
  }

  private async getAssetStats(tenantId: string) {
    const stats = await this.prisma.asset.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {};
    let total = 0;
    for (const stat of stats) {
      statusMap[stat.status] = stat._count.id;
      total += stat._count.id;
    }

    return {
      total,
      operational: statusMap['operational'] ?? 0,
      underMaintenance: statusMap['maintenance'] ?? 0,
      offline: statusMap['offline'] ?? 0,
    };
  }

  private async getSchedulingStats(tenantId: string) {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    const [activeSchedules, upcomingMaintenance, overdueSchedules] = await Promise.all([
      this.prisma.maintenanceSchedule.count({
        where: { tenantId, isActive: true },
      }),
      this.prisma.maintenanceSchedule.count({
        where: {
          tenantId,
          isActive: true,
          nextDueDate: { gte: now, lte: nextWeek },
        },
      }),
      this.prisma.maintenanceSchedule.count({
        where: {
          tenantId,
          isActive: true,
          nextDueDate: { lt: now },
        },
      }),
    ]);

    return {
      activeSchedules,
      upcomingMaintenance,
      overdueSchedules,
    };
  }

  async getWorkOrderTrends(ctx: TenantContext, period: string = 'month') {
    const now = new Date();
    let startDate: Date;
    let groupBy: 'day' | 'week' | 'month';

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        groupBy = 'day';
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        groupBy = 'week';
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = 'month';
        break;
      case 'month':
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        groupBy = 'day';
        break;
    }

    // Get created and completed work orders grouped by date
    // Use Prisma.raw() to inject groupBy as literal SQL since DATE_TRUNC expects a string literal
    const groupByLiteral = Prisma.raw(`'${groupBy}'`);
    const [created, completed] = await Promise.all([
      this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE_TRUNC(${groupByLiteral}, created_at) as date, COUNT(*) as count
        FROM work_orders
        WHERE tenant_id = ${ctx.tenantId}::uuid
          AND created_at >= ${startDate}
        GROUP BY 1
        ORDER BY date
      `,
      this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE_TRUNC(${groupByLiteral}, completed_at) as date, COUNT(*) as count
        FROM work_orders
        WHERE tenant_id = ${ctx.tenantId}::uuid
          AND completed_at >= ${startDate}
          AND status = 'completed'
        GROUP BY 1
        ORDER BY date
      `,
    ]);

    // Merge created and completed into a single array
    const createdMap = new Map(created.map(c => [c.date.toISOString().split('T')[0], Number(c.count)]));
    const completedMap = new Map(completed.map(c => [c.date.toISOString().split('T')[0], Number(c.count)]));

    // Generate all dates in range
    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= now) {
      dates.push(current.toISOString().split('T')[0]);
      if (groupBy === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (groupBy === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return dates.map(date => ({
      date,
      created: createdMap.get(date) ?? 0,
      completed: completedMap.get(date) ?? 0,
    }));
  }

  async getWorkOrdersByPriority(ctx: TenantContext) {
    const stats = await this.prisma.workOrder.groupBy({
      by: ['priority'],
      where: { tenantId: ctx.tenantId },
      _count: { id: true },
    });

    const priorities = ['low', 'medium', 'high', 'critical'];
    const statsMap = new Map(stats.map(s => [s.priority, s._count.id]));

    return priorities.map(priority => ({
      priority,
      count: statsMap.get(priority) ?? 0,
    }));
  }

  async getWorkOrdersByType(ctx: TenantContext) {
    const stats = await this.prisma.workOrder.groupBy({
      by: ['type'],
      where: { tenantId: ctx.tenantId },
      _count: { id: true },
    });

    const types = ['reactive', 'preventive', 'predictive', 'inspection'];
    const statsMap = new Map(stats.map(s => [s.type, s._count.id]));

    return types.map(type => ({
      type,
      count: statsMap.get(type) ?? 0,
    }));
  }

  async getWorkOrdersByStatus(ctx: TenantContext) {
    const stats = await this.prisma.workOrder.groupBy({
      by: ['status'],
      where: { tenantId: ctx.tenantId },
      _count: { id: true },
    });

    const statuses = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled'];
    const statsMap = new Map(stats.map(s => [s.status, s._count.id]));

    return statuses.map(status => ({
      status,
      count: statsMap.get(status) ?? 0,
    }));
  }

  async getTechnicianPerformance(ctx: TenantContext, period: string = 'month', limit: number = 10) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
    }

    // Get technicians with completed work orders
    const technicianStats = await this.prisma.$queryRaw<{
      user_id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
      work_orders_completed: bigint;
      avg_completion_hours: number | null;
    }[]>`
      SELECT
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.avatar_url,
        COUNT(wo.id) as work_orders_completed,
        AVG(wo.actual_hours)::float as avg_completion_hours
      FROM users u
      JOIN work_orders wo ON wo.assigned_to_id = u.id
      WHERE wo.tenant_id = ${ctx.tenantId}::uuid
        AND wo.status = 'completed'
        AND wo.completed_at >= ${startDate}
      GROUP BY u.id, u.first_name, u.last_name, u.avatar_url
      ORDER BY work_orders_completed DESC
      LIMIT ${limit}
    `;

    // Get labor hours for each technician
    const laborHours = await this.prisma.$queryRaw<{
      user_id: string;
      total_hours: number | null;
    }[]>`
      SELECT
        user_id,
        SUM(hours)::float as total_hours
      FROM work_order_labor
      WHERE tenant_id = ${ctx.tenantId}::uuid
        AND created_at >= ${startDate}
      GROUP BY user_id
    `;

    const laborMap = new Map(laborHours.map(l => [l.user_id, l.total_hours ?? 0]));

    return technicianStats.map(tech => ({
      userId: tech.user_id,
      name: `${tech.first_name} ${tech.last_name}`,
      avatarUrl: tech.avatar_url,
      workOrdersCompleted: Number(tech.work_orders_completed),
      avgCompletionTime: tech.avg_completion_hours ?? 0,
      hoursLogged: laborMap.get(tech.user_id) ?? 0,
    }));
  }

  async getRecentActivity(ctx: TenantContext, limit: number = 20) {
    const activities: {
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      entityId?: string;
      entityType?: string;
    }[] = [];

    // Get recent work order activities from audit log
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        tenantId: ctx.tenantId,
        entityType: { in: ['WorkOrder', 'MaintenanceSchedule', 'InventoryItem', 'Asset'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    for (const log of auditLogs) {
      const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System';
      let type = '';
      let title = '';
      let description = '';

      switch (log.entityType) {
        case 'WorkOrder':
          if (log.action === 'create') {
            type = 'work_order_created';
            title = 'Work Order Created';
            description = `${userName} created a new work order`;
          } else if (log.action === 'update') {
            const changes = log.changes as Record<string, unknown>;
            if (changes && changes.status === 'completed') {
              type = 'work_order_completed';
              title = 'Work Order Completed';
              description = `${userName} completed a work order`;
            } else {
              type = 'work_order_updated';
              title = 'Work Order Updated';
              description = `${userName} updated a work order`;
            }
          }
          break;
        case 'MaintenanceSchedule':
          type = 'schedule_generated';
          title = 'Schedule Activity';
          description = `${userName} ${log.action}d a maintenance schedule`;
          break;
        case 'InventoryItem':
          if (log.action === 'update') {
            type = 'low_inventory';
            title = 'Inventory Updated';
            description = `${userName} updated inventory`;
          }
          break;
        case 'Asset':
          if (log.action === 'update') {
            const changes = log.changes as Record<string, unknown>;
            if (changes && changes.status === 'offline') {
              type = 'asset_offline';
              title = 'Asset Offline';
              description = `${userName} marked an asset as offline`;
            }
          }
          break;
      }

      if (type) {
        activities.push({
          id: log.id,
          type,
          title,
          description,
          timestamp: log.createdAt.toISOString(),
          entityId: log.entityId,
          entityType: log.entityType,
        });
      }
    }

    // Also get low stock alerts
    const lowStockItems = await this.prisma.inventoryItem.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        currentStock: { lte: 5 },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });

    for (const item of lowStockItems) {
      activities.push({
        id: `low-stock-${item.id}`,
        type: 'low_inventory',
        title: 'Low Stock Alert',
        description: `${item.name} is running low (${item.currentStock} remaining)`,
        timestamp: item.updatedAt.toISOString(),
        entityId: item.id,
        entityType: 'InventoryItem',
      });
    }

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getAssetHealth(ctx: TenantContext, limit: number = 10, sortBy: string = 'healthScore') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get assets with their work order counts and last maintenance dates
    const assets = await this.prisma.asset.findMany({
      where: { tenantId: ctx.tenantId },
      take: limit * 2, // Get more for filtering
      include: {
        _count: {
          select: { workOrders: true },
        },
        workOrders: {
          where: { createdAt: { gte: startOfMonth } },
          select: { id: true },
        },
      },
    });

    // Get last completed maintenance for each asset
    const lastMaintenanceDates = await this.prisma.workOrder.groupBy({
      by: ['assetId'],
      where: {
        tenantId: ctx.tenantId,
        assetId: { in: assets.map(a => a.id) },
        status: 'completed',
        type: { in: ['preventive', 'predictive'] },
      },
      _max: { completedAt: true },
    });

    const lastMaintenanceMap = new Map(
      lastMaintenanceDates.map(lm => [lm.assetId, lm._max.completedAt]),
    );

    // Calculate health scores
    const assetHealthData = assets.map(asset => {
      const lastMaintenance = lastMaintenanceMap.get(asset.id);
      const workOrdersThisMonth = asset.workOrders.length;
      const totalWorkOrders = asset._count.workOrders;

      // Health score calculation:
      // - Base score of 100
      // - Deduct for each work order this month (indicates problems)
      // - Deduct if no recent maintenance
      // - Deduct if offline or under maintenance
      let healthScore = 100;

      // Deduct for work orders this month (more = worse health)
      healthScore -= Math.min(workOrdersThisMonth * 10, 40);

      // Deduct if no maintenance in last 90 days
      if (lastMaintenance) {
        const daysSinceMaintenance = Math.floor(
          (now.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceMaintenance > 90) {
          healthScore -= 20;
        } else if (daysSinceMaintenance > 60) {
          healthScore -= 10;
        }
      } else if (totalWorkOrders > 0) {
        healthScore -= 15;
      }

      // Deduct for current status
      if (asset.status === 'offline') {
        healthScore -= 30;
      } else if (asset.status === 'maintenance') {
        healthScore -= 10;
      }

      return {
        assetId: asset.id,
        name: asset.name,
        assetTag: asset.assetTag,
        status: asset.status,
        lastMaintenanceDate: lastMaintenance?.toISOString() ?? null,
        workOrdersThisMonth,
        healthScore: Math.max(0, Math.min(100, healthScore)),
      };
    });

    // Sort based on sortBy parameter
    switch (sortBy) {
      case 'workOrders':
        assetHealthData.sort((a, b) => b.workOrdersThisMonth - a.workOrdersThisMonth);
        break;
      case 'lastMaintenance':
        assetHealthData.sort((a, b) => {
          if (!a.lastMaintenanceDate) return 1;
          if (!b.lastMaintenanceDate) return -1;
          return new Date(a.lastMaintenanceDate).getTime() - new Date(b.lastMaintenanceDate).getTime();
        });
        break;
      case 'healthScore':
      default:
        assetHealthData.sort((a, b) => a.healthScore - b.healthScore);
        break;
    }

    return assetHealthData.slice(0, limit);
  }
}
