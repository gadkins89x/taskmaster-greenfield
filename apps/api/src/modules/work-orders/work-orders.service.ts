import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

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
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    return this.mapWorkOrderDetail(workOrder);
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

  private mapWorkOrderDetail(wo: any) {
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
      steps: wo.steps?.map((s: any) => ({
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
      comments: wo.comments?.map((c: any) => ({
        id: c.id,
        content: c.content,
        user: c.user,
        isInternal: c.isInternal,
        createdAt: c.createdAt.toISOString(),
      })) ?? [],
      signatures: wo.signatures?.map((s: any) => ({
        id: s.id,
        user: s.user,
        type: s.type,
        signedAt: s.signedAt.toISOString(),
      })) ?? [],
      version: wo.version,
      createdAt: wo.createdAt.toISOString(),
      updatedAt: wo.updatedAt.toISOString(),
    };
  }
}
