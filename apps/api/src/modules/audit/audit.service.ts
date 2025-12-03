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

  async findByEntity(tenantId: string, entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
