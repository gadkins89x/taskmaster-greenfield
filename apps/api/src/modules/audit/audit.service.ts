import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

interface AuditLogEntry {
  tenantId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditSearchFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  async findAll(tenantId: string, filters: AuditSearchFilters) {
    const { page = 1, limit = 50, entityType, entityId, userId, action, startDate, endDate } = filters;

    const where = {
      tenantId,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(userId && { userId }),
      ...(action && { action }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => this.mapAuditLog(log)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByEntity(tenantId: string, entityType: string, entityId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return logs.map((log) => this.mapAuditLog(log));
  }

  async getEntityTypes(tenantId: string) {
    const results = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      where: { tenantId },
      _count: { entityType: true },
    });

    return results.map((r) => ({
      entityType: r.entityType,
      count: r._count.entityType,
    }));
  }

  async getStats(tenantId: string, period: 'day' | 'week' | 'month' = 'week') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [byAction, byEntityType, totalCount] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: { action: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: { entityType: true },
      }),
      this.prisma.auditLog.count({
        where: { tenantId, createdAt: { gte: startDate } },
      }),
    ]);

    return {
      period,
      totalEvents: totalCount,
      byAction: byAction.map((r) => ({ action: r.action, count: r._count.action })),
      byEntityType: byEntityType.map((r) => ({
        entityType: r.entityType,
        count: r._count.entityType,
      })),
    };
  }

  private mapAuditLog(log: any) {
    return {
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      changes: log.changes,
      user: log.user
        ? {
            id: log.user.id,
            name: `${log.user.firstName} ${log.user.lastName}`,
          }
        : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
