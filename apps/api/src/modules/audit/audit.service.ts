import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

type AuditAction = 'create' | 'update' | 'delete' | 'receive' | 'issue' | 'adjust';

interface AuditLogEntry {
  tenantId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

interface RequestContext {
  tenantId: string;
  userId?: string;
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

  async log(entry: AuditLogEntry): Promise<void>;
  async log(
    ctx: RequestContext,
    entityType: string,
    entityId: string,
    action: AuditAction,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void>;
  async log(
    entryOrCtx: AuditLogEntry | RequestContext,
    entityType?: string,
    entityId?: string,
    action?: AuditAction,
    oldValue?: unknown,
    newValue?: unknown,
  ): Promise<void> {
    let entry: AuditLogEntry;

    if (entityType !== undefined) {
      // Called with positional arguments
      const ctx = entryOrCtx as RequestContext;
      const changes: Record<string, unknown> = {};
      if (oldValue !== null && oldValue !== undefined) {
        changes.old = oldValue;
      }
      if (newValue !== null && newValue !== undefined) {
        changes.new = newValue;
      }
      entry = {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        entityType: entityType!,
        entityId: entityId!,
        action: action!,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      };
    } else {
      // Called with object
      entry = entryOrCtx as AuditLogEntry;
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes as Prisma.InputJsonValue | undefined,
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

  private mapAuditLog(log: Prisma.AuditLogGetPayload<{ include: { user: { select: { id: true; firstName: true; lastName: true } } } }>) {
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
