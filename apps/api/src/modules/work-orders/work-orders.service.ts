import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '@/generated/prisma/client';

// Type definitions for Prisma query results with includes
// Base type with common includes
type WorkOrderBase = Prisma.WorkOrderGetPayload<{
  include: {
    asset: true;
    location: true;
    assignedTo: true;
    createdBy: true;
    steps: {
      include: {
        completedBy: {
          select: { id: true; firstName: true; lastName: true };
        };
      };
    };
  };
}>;

// Full type with all possible includes (some may be undefined)
type WorkOrderWithDetails = WorkOrderBase & {
  comments?: Prisma.WorkOrderCommentGetPayload<{
    include: {
      user: {
        select: { id: true; firstName: true; lastName: true; avatarUrl: true };
      };
    };
  }>[];
  signatures?: Prisma.WorkOrderSignatureGetPayload<{
    include: {
      user: {
        select: { id: true; firstName: true; lastName: true };
      };
    };
  }>[];
  photos?: Prisma.WorkOrderPhotoGetPayload<{
    include: {
      uploadedBy: {
        select: { id: true; firstName: true; lastName: true };
      };
    };
  }>[];
  laborEntries?: Prisma.WorkOrderLaborGetPayload<{
    include: {
      user: {
        select: { id: true; firstName: true; lastName: true };
      };
    };
  }>[];
  partsUsed?: Prisma.WorkOrderPartGetPayload<{
    include: {
      inventoryItem: {
        select: { id: true; itemNumber: true; name: true; currentStock: true };
      };
      addedBy: {
        select: { id: true; firstName: true; lastName: true };
      };
    };
  }>[];
};

type _WorkOrderStepWithCompletedBy = Prisma.WorkOrderStepGetPayload<{
  include: {
    completedBy: {
      select: { id: true; firstName: true; lastName: true };
    };
  };
}>;

type _WorkOrderCommentWithUser = Prisma.WorkOrderCommentGetPayload<{
  include: {
    user: {
      select: { id: true; firstName: true; lastName: true; avatarUrl: true };
    };
  };
}>;

type WorkOrderCommentWithReplies = Prisma.WorkOrderCommentGetPayload<{
  include: {
    user: {
      select: { id: true; firstName: true; lastName: true; avatarUrl: true };
    };
    replies: {
      include: {
        user: {
          select: { id: true; firstName: true; lastName: true; avatarUrl: true };
        };
      };
    };
  };
}>;

type _WorkOrderSignatureWithUser = Prisma.WorkOrderSignatureGetPayload<{
  include: {
    user: {
      select: { id: true; firstName: true; lastName: true };
    };
  };
}>;

type WorkOrderPhotoWithUploadedBy = Prisma.WorkOrderPhotoGetPayload<{
  include: {
    uploadedBy: {
      select: { id: true; firstName: true; lastName: true };
    };
  };
}>;

type WorkOrderLaborWithUser = Prisma.WorkOrderLaborGetPayload<{
  include: {
    user: {
      select: { id: true; firstName: true; lastName: true };
    };
  };
}>;

type WorkOrderPartWithDetails = Prisma.WorkOrderPartGetPayload<{
  include: {
    inventoryItem: {
      select: { id: true; itemNumber: true; name: true; currentStock: true };
    };
    addedBy: {
      select: { id: true; firstName: true; lastName: true };
    };
  };
}>;

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(ctx: TenantContext, filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string[];
    priority?: string[];
    assignedToId?: string;
    assetId?: string;
  }) {
    const { page = 1, limit = 20, search, status, priority, assignedToId, assetId } = filters;

    const where = {
      tenantId: ctx.tenantId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { workOrderNumber: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status?.length && { status: { in: status } }),
      ...(priority?.length && { priority: { in: priority } }),
      ...(assignedToId && { assignedToId }),
      ...(assetId && { assetId }),
    };

    const [workOrders, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          location: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { steps: true, comments: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    // Get completed steps count
    const workOrderIds = workOrders.map((wo) => wo.id);
    const completedSteps = await this.prisma.workOrderStep.groupBy({
      by: ['workOrderId'],
      where: { workOrderId: { in: workOrderIds }, isCompleted: true },
      _count: { id: true },
    });
    const completedMap = new Map(completedSteps.map((cs) => [cs.workOrderId, cs._count.id]));

    return {
      data: workOrders.map((wo) => ({
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        title: wo.title,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        type: wo.type,
        asset: wo.asset,
        location: wo.location,
        assignedTo: wo.assignedTo,
        createdBy: wo.createdBy,
        dueDate: wo.dueDate?.toISOString() ?? null,
        isOverdue: wo.dueDate && wo.status !== 'completed' && wo.dueDate < new Date(),
        estimatedHours: wo.estimatedHours,
        stepsCount: wo._count.steps,
        stepsCompleted: completedMap.get(wo.id) ?? 0,
        commentsCount: wo._count.comments,
        createdAt: wo.createdAt.toISOString(),
        updatedAt: wo.updatedAt.toISOString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(ctx: TenantContext, id: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        asset: true,
        location: true,
        assignedTo: true,
        createdBy: true,
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: { completedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        signatures: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        photos: {
          orderBy: { createdAt: 'desc' },
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
        laborEntries: {
          orderBy: { startTime: 'desc' },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        partsUsed: {
          orderBy: { createdAt: 'desc' },
          include: {
            inventoryItem: { select: { id: true, itemNumber: true, name: true, currentStock: true } },
            addedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    return this.mapWorkOrderDetail(workOrder);
  }

  async create(ctx: TenantContext, data: {
    title: string;
    description?: string;
    priority: string;
    type: string;
    assetId?: string;
    locationId?: string;
    assignedToId?: string;
    dueDate?: string;
    estimatedHours?: number;
    steps?: { title: string; description?: string; isRequired?: boolean }[];
  }) {
    const workOrderNumber = await this.generateWorkOrderNumber(ctx.tenantId);

    const workOrder = await this.prisma.workOrder.create({
      data: {
        tenantId: ctx.tenantId,
        workOrderNumber,
        title: data.title,
        description: data.description,
        priority: data.priority,
        type: data.type,
        assetId: data.assetId,
        locationId: data.locationId,
        assignedToId: data.assignedToId,
        createdById: ctx.userId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours,
        steps: data.steps?.length ? {
          create: data.steps.map((step, index) => ({
            tenantId: ctx.tenantId,
            stepOrder: index + 1,
            title: step.title,
            description: step.description,
            isRequired: step.isRequired ?? true,
          })),
        } : undefined,
      },
      include: {
        asset: true,
        location: true,
        assignedTo: true,
        createdBy: true,
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            completedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return this.mapWorkOrderDetail(workOrder as WorkOrderWithDetails);
  }

  async update(ctx: TenantContext, id: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    assignedToId?: string;
    dueDate?: string;
    estimatedHours?: number;
    expectedVersion: number;
  }) {
    const result = await this.prisma.workOrder.updateMany({
      where: {
        id,
        tenantId: ctx.tenantId,
        version: data.expectedVersion,
      },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignedToId: data.assignedToId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        estimatedHours: data.estimatedHours,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Work order was modified by another user');
    }

    return this.findById(ctx, id);
  }

  async start(ctx: TenantContext, id: string) {
    await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
        version: { increment: 1 },
      },
    });
    return this.findById(ctx, id);
  }

  async complete(ctx: TenantContext, id: string, data: {
    completionNotes?: string;
    actualHours?: number;
    expectedVersion: number;
  }) {
    // Check all required steps are completed
    const incompleteSteps = await this.prisma.workOrderStep.findMany({
      where: { workOrderId: id, isRequired: true, isCompleted: false },
    });

    if (incompleteSteps.length > 0) {
      throw new BadRequestException({
        message: 'Cannot complete work order with incomplete required steps',
        incompleteSteps: incompleteSteps.map((s) => ({ id: s.id, title: s.title })),
      });
    }

    const result = await this.prisma.workOrder.updateMany({
      where: {
        id,
        tenantId: ctx.tenantId,
        version: data.expectedVersion,
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completionNotes: data.completionNotes,
        actualHours: data.actualHours,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Work order was modified by another user');
    }

    return this.findById(ctx, id);
  }

  private async generateWorkOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WO-${year}-`;

    const lastWO = await this.prisma.workOrder.findFirst({
      where: {
        tenantId,
        workOrderNumber: { startsWith: prefix },
      },
      orderBy: { workOrderNumber: 'desc' },
      select: { workOrderNumber: true },
    });

    let nextNumber = 1;
    if (lastWO) {
      const lastNumber = parseInt(lastWO.workOrderNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  private mapWorkOrderDetail(wo: WorkOrderWithDetails) {
    return {
      id: wo.id,
      workOrderNumber: wo.workOrderNumber,
      title: wo.title,
      description: wo.description,
      status: wo.status,
      priority: wo.priority,
      type: wo.type,
      asset: wo.asset ? {
        id: wo.asset.id,
        name: wo.asset.name,
        assetTag: wo.asset.assetTag,
        manufacturer: wo.asset.manufacturer,
        model: wo.asset.model,
      } : null,
      location: wo.location ? {
        id: wo.location.id,
        name: wo.location.name,
        code: wo.location.code,
        type: wo.location.type,
      } : null,
      assignedTo: wo.assignedTo ? {
        id: wo.assignedTo.id,
        firstName: wo.assignedTo.firstName,
        lastName: wo.assignedTo.lastName,
        email: wo.assignedTo.email,
        avatarUrl: wo.assignedTo.avatarUrl,
      } : null,
      createdBy: {
        id: wo.createdBy.id,
        firstName: wo.createdBy.firstName,
        lastName: wo.createdBy.lastName,
      },
      dueDate: wo.dueDate?.toISOString() ?? null,
      startedAt: wo.startedAt?.toISOString() ?? null,
      completedAt: wo.completedAt?.toISOString() ?? null,
      isOverdue: wo.dueDate && wo.status !== 'completed' && wo.dueDate < new Date(),
      estimatedHours: wo.estimatedHours,
      actualHours: wo.actualHours,
      completionNotes: wo.completionNotes,
      steps: wo.steps?.map((s) => ({
        id: s.id,
        stepOrder: s.stepOrder,
        title: s.title,
        description: s.description,
        isRequired: s.isRequired,
        isCompleted: s.isCompleted,
        completedBy: s.completedBy,
        completedAt: s.completedAt?.toISOString() ?? null,
        completionNotes: s.completionNotes,
      })) ?? [],
      comments: wo.comments?.map((c) => ({
        id: c.id,
        content: c.content,
        user: c.user,
        isInternal: c.isInternal,
        createdAt: c.createdAt.toISOString(),
      })) ?? [],
      signatures: wo.signatures?.map((s) => ({
        id: s.id,
        user: s.user,
        type: s.type,
        signedAt: s.signedAt.toISOString(),
      })) ?? [],
      photos: wo.photos?.map((p) => ({
        id: p.id,
        filename: p.filename,
        mimeType: p.mimeType,
        size: p.size,
        url: p.url,
        caption: p.caption,
        category: p.category,
        uploadedBy: p.uploadedBy,
        createdAt: p.createdAt.toISOString(),
      })) ?? [],
      laborEntries: wo.laborEntries?.map((l) => ({
        id: l.id,
        userId: l.userId,
        user: l.user,
        startTime: l.startTime.toISOString(),
        endTime: l.endTime?.toISOString() ?? null,
        hours: l.hours ? Number(l.hours) : null,
        description: l.description,
        laborType: l.laborType,
        hourlyRate: l.hourlyRate ? Number(l.hourlyRate) : null,
        createdAt: l.createdAt.toISOString(),
      })) ?? [],
      partsUsed: wo.partsUsed?.map((p) => ({
        id: p.id,
        inventoryItemId: p.inventoryItemId,
        partNumber: p.partNumber,
        partName: p.partName,
        quantity: p.quantity,
        unitCost: p.unitCost ? Number(p.unitCost) : null,
        totalCost: p.totalCost ? Number(p.totalCost) : null,
        notes: p.notes,
        status: p.status,
        inventoryItem: p.inventoryItem,
        addedBy: p.addedBy,
        createdAt: p.createdAt.toISOString(),
      })) ?? [],
      version: wo.version,
      createdAt: wo.createdAt.toISOString(),
      updatedAt: wo.updatedAt.toISOString(),
    };
  }

  // ============================================================================
  // Comments
  // ============================================================================

  async addComment(
    ctx: TenantContext,
    workOrderId: string,
    data: {
      content: string;
      parentId?: string;
      isInternal?: boolean;
    },
  ) {
    // Verify work order exists and belongs to tenant
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: ctx.tenantId },
      include: {
        createdBy: { select: { id: true } },
        assignedTo: { select: { id: true } },
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // If parentId is provided, verify it exists
    if (data.parentId) {
      const parentComment = await this.prisma.workOrderComment.findFirst({
        where: { id: data.parentId, workOrderId },
      });
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.workOrderComment.create({
      data: {
        tenantId: ctx.tenantId,
        workOrderId,
        userId: ctx.userId,
        content: data.content,
        parentId: data.parentId,
        isInternal: data.isInternal ?? false,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replies: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    // Get commenter info for notification
    const commenter = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { firstName: true, lastName: true },
    });

    const commenterName = commenter ? `${commenter.firstName} ${commenter.lastName}` : 'Someone';

    // Notify relevant users (assignee and creator)
    const notifyUserIds = new Set<string>();
    if (workOrder.createdBy) notifyUserIds.add(workOrder.createdBy.id);
    if (workOrder.assignedTo) notifyUserIds.add(workOrder.assignedTo.id);

    for (const userId of notifyUserIds) {
      await this.notificationsService.notifyWorkOrderComment(
        ctx.tenantId,
        userId,
        ctx.userId,
        commenterName,
        workOrderId,
        workOrder.workOrderNumber,
      );
    }

    return this.mapComment(comment);
  }

  async getComments(
    ctx: TenantContext,
    workOrderId: string,
    options: { includeInternal?: boolean; page?: number; limit?: number } = {},
  ) {
    const { includeInternal = true, page = 1, limit = 50 } = options;

    // Verify work order exists
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: ctx.tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    const where: Record<string, unknown> = {
      workOrderId,
      tenantId: ctx.tenantId,
      parentId: null, // Only get top-level comments
    };

    if (!includeInternal) {
      where.isInternal = false;
    }

    const [comments, total] = await Promise.all([
      this.prisma.workOrderComment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
          },
        },
      }),
      this.prisma.workOrderComment.count({ where }),
    ]);

    return {
      data: comments.map((c) => this.mapComment(c)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateComment(
    ctx: TenantContext,
    workOrderId: string,
    commentId: string,
    data: { content: string },
  ) {
    const comment = await this.prisma.workOrderComment.findFirst({
      where: { id: commentId, workOrderId, tenantId: ctx.tenantId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the author can update their comment
    if (comment.userId !== ctx.userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.workOrderComment.update({
      where: { id: commentId },
      data: { content: data.content },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        replies: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    return this.mapComment(updated);
  }

  async deleteComment(ctx: TenantContext, workOrderId: string, commentId: string) {
    const comment = await this.prisma.workOrderComment.findFirst({
      where: { id: commentId, workOrderId, tenantId: ctx.tenantId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the author can delete their comment
    if (comment.userId !== ctx.userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Delete will cascade to replies
    await this.prisma.workOrderComment.delete({ where: { id: commentId } });

    return { success: true };
  }

  private mapComment(comment: WorkOrderCommentWithReplies) {
    return {
      id: comment.id,
      content: comment.content,
      user: comment.user,
      isInternal: comment.isInternal,
      parentId: comment.parentId,
      replies: comment.replies?.map((r) => ({
        id: r.id,
        content: r.content,
        user: r.user,
        isInternal: r.isInternal,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })) ?? [],
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  // ============================================================================
  // Activity Feed
  // ============================================================================

  async getActivityFeed(
    ctx: TenantContext,
    workOrderId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 50 } = options;

    // Verify work order exists
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: ctx.tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // Fetch comments, step completions, and audit logs in parallel
    const [comments, steps, auditLogs] = await Promise.all([
      this.prisma.workOrderComment.findMany({
        where: { workOrderId, tenantId: ctx.tenantId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workOrderStep.findMany({
        where: { workOrderId, isCompleted: true },
        include: {
          completedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: {
          tenantId: ctx.tenantId,
          entityType: 'WorkOrder',
          entityId: workOrderId,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Combine and transform into unified activity items
    type ActivityItem = {
      id: string;
      type: 'comment' | 'step_completed' | 'status_change' | 'created' | 'updated';
      timestamp: Date;
      user: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
      data: Record<string, unknown>;
    };

    const activities: ActivityItem[] = [];

    // Add comments
    for (const comment of comments) {
      activities.push({
        id: `comment-${comment.id}`,
        type: 'comment',
        timestamp: comment.createdAt,
        user: comment.user,
        data: {
          commentId: comment.id,
          content: comment.content,
          isInternal: comment.isInternal,
        },
      });
    }

    // Add step completions
    for (const step of steps) {
      if (step.completedAt) {
        activities.push({
          id: `step-${step.id}`,
          type: 'step_completed',
          timestamp: step.completedAt,
          user: step.completedBy,
          data: {
            stepId: step.id,
            stepTitle: step.title,
            stepOrder: step.stepOrder,
            completionNotes: step.completionNotes,
          },
        });
      }
    }

    // Add audit log entries (status changes, updates)
    for (const log of auditLogs) {
      let activityType: ActivityItem['type'] = 'updated';
      if (log.action === 'create') {
        activityType = 'created';
      } else if (log.action === 'update') {
        const changes = log.changes as Record<string, unknown> | null;
        if (changes && 'status' in changes) {
          activityType = 'status_change';
        }
      }

      activities.push({
        id: `audit-${log.id}`,
        type: activityType,
        timestamp: log.createdAt,
        user: log.user,
        data: {
          action: log.action,
          changes: log.changes,
        },
      });
    }

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Paginate
    const total = activities.length;
    const startIndex = (page - 1) * limit;
    const paginatedActivities = activities.slice(startIndex, startIndex + limit);

    return {
      data: paginatedActivities.map((a) => ({
        id: a.id,
        type: a.type,
        timestamp: a.timestamp.toISOString(),
        user: a.user,
        data: a.data,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ============================================================================
  // Steps
  // ============================================================================

  async completeStep(
    ctx: TenantContext,
    workOrderId: string,
    stepId: string,
    data: { completionNotes?: string },
  ) {
    // Verify work order exists
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: ctx.tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    const step = await this.prisma.workOrderStep.findFirst({
      where: { id: stepId, workOrderId },
    });

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    if (step.isCompleted) {
      throw new BadRequestException('Step is already completed');
    }

    const updated = await this.prisma.workOrderStep.update({
      where: { id: stepId },
      data: {
        isCompleted: true,
        completedById: ctx.userId,
        completedAt: new Date(),
        completionNotes: data.completionNotes,
      },
      include: {
        completedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      id: updated.id,
      stepOrder: updated.stepOrder,
      title: updated.title,
      description: updated.description,
      isRequired: updated.isRequired,
      isCompleted: updated.isCompleted,
      completedBy: updated.completedBy,
      completedAt: updated.completedAt?.toISOString() ?? null,
      completionNotes: updated.completionNotes,
    };
  }

  async uncompleteStep(ctx: TenantContext, workOrderId: string, stepId: string) {
    // Verify work order exists
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: ctx.tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    const step = await this.prisma.workOrderStep.findFirst({
      where: { id: stepId, workOrderId },
    });

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    if (!step.isCompleted) {
      throw new BadRequestException('Step is not completed');
    }

    const updated = await this.prisma.workOrderStep.update({
      where: { id: stepId },
      data: {
        isCompleted: false,
        completedById: null,
        completedAt: null,
        completionNotes: null,
      },
    });

    return {
      id: updated.id,
      stepOrder: updated.stepOrder,
      title: updated.title,
      description: updated.description,
      isRequired: updated.isRequired,
      isCompleted: updated.isCompleted,
      completedBy: null,
      completedAt: null,
      completionNotes: null,
    };
  }

  // ============================================================================
  // Photos
  // ============================================================================

  async uploadPhoto(
    ctx: TenantContext,
    workOrderId: string,
    data: {
      dataUrl: string;
      filename: string;
      caption?: string;
      category?: string;
    },
  ) {
    // Verify work order exists
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: ctx.tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // Parse data URL to extract mime type and size
    const matches = data.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException('Invalid data URL format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const size = Math.ceil((base64Data.length * 3) / 4); // Approximate size in bytes

    const photo = await this.prisma.workOrderPhoto.create({
      data: {
        tenantId: ctx.tenantId,
        workOrderId,
        uploadedById: ctx.userId,
        filename: data.filename,
        mimeType,
        size,
        url: data.dataUrl,
        caption: data.caption,
        category: data.category,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapPhoto(photo);
  }

  async updatePhoto(
    ctx: TenantContext,
    workOrderId: string,
    photoId: string,
    data: { caption?: string; category?: string },
  ) {
    const photo = await this.prisma.workOrderPhoto.findFirst({
      where: { id: photoId, workOrderId, tenantId: ctx.tenantId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    const updated = await this.prisma.workOrderPhoto.update({
      where: { id: photoId },
      data: {
        caption: data.caption,
        category: data.category,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapPhoto(updated);
  }

  async deletePhoto(ctx: TenantContext, workOrderId: string, photoId: string) {
    const photo = await this.prisma.workOrderPhoto.findFirst({
      where: { id: photoId, workOrderId, tenantId: ctx.tenantId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    await this.prisma.workOrderPhoto.delete({ where: { id: photoId } });

    return { success: true };
  }

  private mapPhoto(photo: WorkOrderPhotoWithUploadedBy) {
    return {
      id: photo.id,
      filename: photo.filename,
      mimeType: photo.mimeType,
      size: photo.size,
      url: photo.url,
      caption: photo.caption,
      category: photo.category,
      uploadedBy: photo.uploadedBy,
      createdAt: photo.createdAt.toISOString(),
    };
  }

  // ============================================================================
  // Labor Tracking
  // ============================================================================

  async addLaborEntry(
    ctx: TenantContext,
    workOrderId: string,
    data: {
      startTime: string;
      endTime?: string;
      hours?: number;
      description?: string;
      laborType?: string;
    },
  ) {
    // Verify work order exists
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: ctx.tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // Calculate hours if both start and end time provided
    let calculatedHours = data.hours;
    if (data.startTime && data.endTime && !calculatedHours) {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      calculatedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    const labor = await this.prisma.workOrderLabor.create({
      data: {
        tenantId: ctx.tenantId,
        workOrderId,
        userId: ctx.userId,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : null,
        hours: calculatedHours,
        description: data.description,
        laborType: data.laborType ?? 'regular',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapLabor(labor);
  }

  async updateLaborEntry(
    ctx: TenantContext,
    workOrderId: string,
    laborId: string,
    data: {
      startTime?: string;
      endTime?: string;
      hours?: number;
      description?: string;
      laborType?: string;
    },
  ) {
    const labor = await this.prisma.workOrderLabor.findFirst({
      where: { id: laborId, workOrderId, tenantId: ctx.tenantId },
    });

    if (!labor) {
      throw new NotFoundException('Labor entry not found');
    }

    // Calculate hours if both times are being provided/updated
    let calculatedHours = data.hours;
    const startTime = data.startTime ? new Date(data.startTime) : labor.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : labor.endTime;

    if (startTime && endTime && !calculatedHours) {
      calculatedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    }

    const updated = await this.prisma.workOrderLabor.update({
      where: { id: laborId },
      data: {
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        hours: calculatedHours,
        description: data.description,
        laborType: data.laborType,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapLabor(updated);
  }

  async deleteLaborEntry(ctx: TenantContext, workOrderId: string, laborId: string) {
    const labor = await this.prisma.workOrderLabor.findFirst({
      where: { id: laborId, workOrderId, tenantId: ctx.tenantId },
    });

    if (!labor) {
      throw new NotFoundException('Labor entry not found');
    }

    // Only the user who logged the labor or admin can delete
    if (labor.userId !== ctx.userId) {
      throw new ForbiddenException('You can only delete your own labor entries');
    }

    await this.prisma.workOrderLabor.delete({ where: { id: laborId } });

    return { success: true };
  }

  async startLaborTimer(ctx: TenantContext, workOrderId: string) {
    // Verify work order exists
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: ctx.tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // Check for existing active timer
    const existingTimer = await this.prisma.workOrderLabor.findFirst({
      where: {
        workOrderId,
        userId: ctx.userId,
        endTime: null,
      },
    });

    if (existingTimer) {
      throw new BadRequestException('You already have an active timer on this work order');
    }

    const labor = await this.prisma.workOrderLabor.create({
      data: {
        tenantId: ctx.tenantId,
        workOrderId,
        userId: ctx.userId,
        startTime: new Date(),
        laborType: 'regular',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapLabor(labor);
  }

  async stopLaborTimer(
    ctx: TenantContext,
    workOrderId: string,
    laborId: string,
    data?: { description?: string },
  ) {
    const labor = await this.prisma.workOrderLabor.findFirst({
      where: { id: laborId, workOrderId, tenantId: ctx.tenantId },
    });

    if (!labor) {
      throw new NotFoundException('Labor entry not found');
    }

    if (labor.endTime) {
      throw new BadRequestException('Timer is already stopped');
    }

    if (labor.userId !== ctx.userId) {
      throw new ForbiddenException('You can only stop your own timer');
    }

    const endTime = new Date();
    const hours = (endTime.getTime() - labor.startTime.getTime()) / (1000 * 60 * 60);

    const updated = await this.prisma.workOrderLabor.update({
      where: { id: laborId },
      data: {
        endTime,
        hours,
        description: data?.description,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapLabor(updated);
  }

  private mapLabor(labor: WorkOrderLaborWithUser) {
    return {
      id: labor.id,
      userId: labor.userId,
      user: labor.user,
      startTime: labor.startTime.toISOString(),
      endTime: labor.endTime?.toISOString() ?? null,
      hours: labor.hours ? Number(labor.hours) : null,
      description: labor.description,
      laborType: labor.laborType,
      hourlyRate: labor.hourlyRate ? Number(labor.hourlyRate) : null,
      createdAt: labor.createdAt.toISOString(),
    };
  }

  // ============================================================================
  // Parts
  // ============================================================================

  async addPart(
    ctx: TenantContext,
    workOrderId: string,
    data: {
      inventoryItemId?: string;
      partNumber?: string;
      partName: string;
      quantity: number;
      unitCost?: number;
      notes?: string;
    },
  ) {
    // Verify work order exists
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, tenantId: ctx.tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // If inventory item is specified, validate and get details
    let inventoryItem = null;
    if (data.inventoryItemId) {
      inventoryItem = await this.prisma.inventoryItem.findFirst({
        where: { id: data.inventoryItemId, tenantId: ctx.tenantId },
      });

      if (!inventoryItem) {
        throw new NotFoundException('Inventory item not found');
      }

      // Check stock availability
      if (inventoryItem.currentStock < data.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${inventoryItem.currentStock}, Requested: ${data.quantity}`,
        );
      }

      // Deduct from inventory
      await this.prisma.inventoryItem.update({
        where: { id: data.inventoryItemId },
        data: { currentStock: { decrement: data.quantity } },
      });

      // Record transaction
      await this.prisma.inventoryTransaction.create({
        data: {
          tenantId: ctx.tenantId,
          itemId: data.inventoryItemId,
          type: 'issue',
          quantity: -data.quantity,
          previousStock: inventoryItem.currentStock,
          newStock: inventoryItem.currentStock - data.quantity,
          unitCost: inventoryItem.unitCost,
          reference: workOrder.workOrderNumber,
          referenceId: workOrderId,
          notes: `Used in work order ${workOrder.workOrderNumber}`,
          performedById: ctx.userId,
        },
      });
    }

    const totalCost = data.unitCost ? data.unitCost * data.quantity : null;

    const part = await this.prisma.workOrderPart.create({
      data: {
        tenantId: ctx.tenantId,
        workOrderId,
        inventoryItemId: data.inventoryItemId,
        addedById: ctx.userId,
        partNumber: data.partNumber ?? inventoryItem?.partNumber,
        partName: data.partName,
        quantity: data.quantity,
        unitCost: data.unitCost ?? inventoryItem?.unitCost,
        totalCost,
        notes: data.notes,
        status: 'used',
      },
      include: {
        inventoryItem: {
          select: { id: true, itemNumber: true, name: true, currentStock: true },
        },
        addedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapPart(part);
  }

  async updatePart(
    ctx: TenantContext,
    workOrderId: string,
    partId: string,
    data: {
      quantity?: number;
      unitCost?: number;
      notes?: string;
      status?: string;
    },
  ) {
    const part = await this.prisma.workOrderPart.findFirst({
      where: { id: partId, workOrderId, tenantId: ctx.tenantId },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    // Calculate new total cost
    const quantity = data.quantity ?? part.quantity;
    const unitCost = data.unitCost ?? part.unitCost;
    const totalCost = unitCost ? Number(unitCost) * quantity : null;

    const updated = await this.prisma.workOrderPart.update({
      where: { id: partId },
      data: {
        quantity: data.quantity,
        unitCost: data.unitCost,
        notes: data.notes,
        status: data.status,
        totalCost,
      },
      include: {
        inventoryItem: {
          select: { id: true, itemNumber: true, name: true, currentStock: true },
        },
        addedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapPart(updated);
  }

  async deletePart(ctx: TenantContext, workOrderId: string, partId: string) {
    const part = await this.prisma.workOrderPart.findFirst({
      where: { id: partId, workOrderId, tenantId: ctx.tenantId },
      include: { workOrder: true },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    // If it was from inventory, return the stock
    if (part.inventoryItemId && part.status === 'used') {
      const inventoryItem = await this.prisma.inventoryItem.findUnique({
        where: { id: part.inventoryItemId },
      });

      if (inventoryItem) {
        await this.prisma.inventoryItem.update({
          where: { id: part.inventoryItemId },
          data: { currentStock: { increment: part.quantity } },
        });

        // Record return transaction
        await this.prisma.inventoryTransaction.create({
          data: {
            tenantId: ctx.tenantId,
            itemId: part.inventoryItemId,
            type: 'return',
            quantity: part.quantity,
            previousStock: inventoryItem.currentStock,
            newStock: inventoryItem.currentStock + part.quantity,
            reference: part.workOrder.workOrderNumber,
            referenceId: workOrderId,
            notes: `Deleted from work order ${part.workOrder.workOrderNumber}`,
            performedById: ctx.userId,
          },
        });
      }
    }

    await this.prisma.workOrderPart.delete({ where: { id: partId } });

    return { success: true };
  }

  async returnPart(
    ctx: TenantContext,
    workOrderId: string,
    partId: string,
    data: { quantity: number; notes?: string },
  ) {
    const part = await this.prisma.workOrderPart.findFirst({
      where: { id: partId, workOrderId, tenantId: ctx.tenantId },
      include: { workOrder: true },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    if (data.quantity > part.quantity) {
      throw new BadRequestException('Cannot return more than was used');
    }

    // Return to inventory if it came from there
    if (part.inventoryItemId) {
      const inventoryItem = await this.prisma.inventoryItem.findUnique({
        where: { id: part.inventoryItemId },
      });

      if (inventoryItem) {
        await this.prisma.inventoryItem.update({
          where: { id: part.inventoryItemId },
          data: { currentStock: { increment: data.quantity } },
        });

        // Record return transaction
        await this.prisma.inventoryTransaction.create({
          data: {
            tenantId: ctx.tenantId,
            itemId: part.inventoryItemId,
            type: 'return',
            quantity: data.quantity,
            previousStock: inventoryItem.currentStock,
            newStock: inventoryItem.currentStock + data.quantity,
            reference: part.workOrder.workOrderNumber,
            referenceId: workOrderId,
            notes: data.notes ?? `Returned from work order ${part.workOrder.workOrderNumber}`,
            performedById: ctx.userId,
          },
        });
      }
    }

    // Update part quantity or mark as returned
    const newQuantity = part.quantity - data.quantity;
    const updated = await this.prisma.workOrderPart.update({
      where: { id: partId },
      data: {
        quantity: newQuantity,
        status: newQuantity === 0 ? 'returned' : part.status,
        totalCost: part.unitCost ? Number(part.unitCost) * newQuantity : null,
        notes: data.notes ? `${part.notes ?? ''}\n${data.notes}`.trim() : part.notes,
      },
      include: {
        inventoryItem: {
          select: { id: true, itemNumber: true, name: true, currentStock: true },
        },
        addedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return this.mapPart(updated);
  }

  private mapPart(part: WorkOrderPartWithDetails) {
    return {
      id: part.id,
      inventoryItemId: part.inventoryItemId,
      partNumber: part.partNumber,
      partName: part.partName,
      quantity: part.quantity,
      unitCost: part.unitCost ? Number(part.unitCost) : null,
      totalCost: part.totalCost ? Number(part.totalCost) : null,
      notes: part.notes,
      status: part.status,
      inventoryItem: part.inventoryItem,
      addedBy: part.addedBy,
      createdAt: part.createdAt.toISOString(),
    };
  }
}
