import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import { AuditService } from '../audit/audit.service';
import { buildTeamFilter, canAssignToTeam } from '../../common/auth/helpers';
import {
  CreateMaintenanceScheduleDto,
  UpdateMaintenanceScheduleDto,
  ScheduleFrequency,
  ScheduleStepDto,
} from './dto';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(ctx: TenantContext, dto: CreateMaintenanceScheduleDto) {
    // Validate team assignment if provided
    if (dto.teamId !== undefined && !canAssignToTeam(ctx, dto.teamId)) {
      throw new ForbiddenException('You cannot assign schedules to this team');
    }

    // Calculate first due date
    const nextDueDate = this.calculateNextDueDate(
      new Date(dto.startDate),
      dto.frequency,
      dto.interval || 1,
      dto.daysOfWeek,
      dto.dayOfMonth,
      dto.monthOfYear,
    );

    // Use user's primary team as default if not specified
    const teamId = dto.teamId ?? ctx.primaryTeamId;

    const schedule = await this.prisma.maintenanceSchedule.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        description: dto.description,
        assetId: dto.assetId,
        locationId: dto.locationId,
        teamId,
        priority: dto.priority || 'medium',
        estimatedHours: dto.estimatedHours,
        assignedToId: dto.assignedToId,
        frequency: dto.frequency,
        interval: dto.interval || 1,
        daysOfWeek: dto.daysOfWeek || [],
        dayOfMonth: dto.dayOfMonth,
        monthOfYear: dto.monthOfYear,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        leadTimeDays: dto.leadTimeDays ?? 7,
        workOrderTitle: dto.workOrderTitle,
        workOrderType: dto.workOrderType || 'preventive',
        nextDueDate,
        isActive: true,
        steps: dto.steps?.length
          ? {
              create: dto.steps.map((step) => ({
                stepOrder: step.stepOrder,
                title: step.title,
                description: step.description,
                isRequired: step.isRequired ?? true,
              })),
            }
          : undefined,
      },
      include: {
        asset: true,
        location: true,
        team: { select: { id: true, name: true, code: true, color: true } },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    await this.auditService.log(ctx, 'MaintenanceSchedule', schedule.id, 'create', null, schedule);

    return schedule;
  }

  async findAll(
    ctx: TenantContext,
    options: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      assetId?: string;
      locationId?: string;
      teamId?: string; // Optional team filter (admins can filter by specific team)
    } = {},
  ) {
    const { page = 1, limit = 20, isActive, assetId, locationId, teamId } = options;
    const skip = (page - 1) * limit;

    // Build team filter based on user's role and team memberships
    const teamFilter = buildTeamFilter(ctx, teamId);

    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
      ...teamFilter,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (assetId) {
      where.assetId = assetId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const [schedules, total] = await Promise.all([
      this.prisma.maintenanceSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nextDueDate: 'asc' },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          location: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true, code: true, color: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { generatedWorkOrders: true } },
        },
      }),
      this.prisma.maintenanceSchedule.count({ where }),
    ]);

    return {
      data: schedules,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(ctx: TenantContext, id: string) {
    // Build team filter (user can only see schedules from their teams or shared)
    const teamFilter = buildTeamFilter(ctx);

    const schedule = await this.prisma.maintenanceSchedule.findFirst({
      where: { id, tenantId: ctx.tenantId, ...teamFilter },
      include: {
        asset: true,
        location: true,
        team: { select: { id: true, name: true, code: true, color: true } },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        steps: { orderBy: { stepOrder: 'asc' } },
        generatedWorkOrders: {
          take: 10,
          orderBy: { scheduledFor: 'desc' },
          include: {
            workOrder: {
              select: { id: true, workOrderNumber: true, status: true, completedAt: true },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Maintenance schedule not found');
    }

    return schedule;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateMaintenanceScheduleDto) {
    // Validate team assignment if provided
    if (dto.teamId !== undefined && !canAssignToTeam(ctx, dto.teamId)) {
      throw new ForbiddenException('You cannot assign schedules to this team');
    }

    const existing = await this.findOne(ctx, id);

    // Recalculate next due date if schedule parameters changed
    let nextDueDate = existing.nextDueDate;
    if (dto.frequency || dto.interval || dto.daysOfWeek || dto.dayOfMonth || dto.monthOfYear) {
      const baseDate = existing.lastGeneratedAt || existing.startDate;
      nextDueDate = this.calculateNextDueDate(
        baseDate,
        dto.frequency || existing.frequency as ScheduleFrequency,
        dto.interval || existing.interval,
        dto.daysOfWeek || existing.daysOfWeek,
        dto.dayOfMonth ?? existing.dayOfMonth,
        dto.monthOfYear ?? existing.monthOfYear,
      );
    }

    const schedule = await this.prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        assetId: dto.assetId,
        locationId: dto.locationId,
        teamId: dto.teamId,
        priority: dto.priority,
        estimatedHours: dto.estimatedHours,
        assignedToId: dto.assignedToId,
        frequency: dto.frequency,
        interval: dto.interval,
        daysOfWeek: dto.daysOfWeek,
        dayOfMonth: dto.dayOfMonth,
        monthOfYear: dto.monthOfYear,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        leadTimeDays: dto.leadTimeDays,
        workOrderTitle: dto.workOrderTitle,
        workOrderType: dto.workOrderType,
        isActive: dto.isActive,
        nextDueDate,
      },
      include: {
        asset: true,
        location: true,
        team: { select: { id: true, name: true, code: true, color: true } },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    await this.auditService.log(ctx, 'MaintenanceSchedule', id, 'update', existing, schedule);

    return schedule;
  }

  async delete(ctx: TenantContext, id: string) {
    const existing = await this.findOne(ctx, id);

    await this.prisma.maintenanceSchedule.delete({ where: { id } });

    await this.auditService.log(ctx, 'MaintenanceSchedule', id, 'delete', existing, null);

    return { success: true };
  }

  async addStep(ctx: TenantContext, scheduleId: string, dto: ScheduleStepDto) {
    await this.findOne(ctx, scheduleId);

    const step = await this.prisma.maintenanceScheduleStep.create({
      data: {
        scheduleId,
        stepOrder: dto.stepOrder,
        title: dto.title,
        description: dto.description,
        isRequired: dto.isRequired ?? true,
      },
    });

    return step;
  }

  async removeStep(ctx: TenantContext, scheduleId: string, stepId: string) {
    await this.findOne(ctx, scheduleId);

    await this.prisma.maintenanceScheduleStep.delete({
      where: { id: stepId },
    });

    return { success: true };
  }

  async generateWorkOrderManually(ctx: TenantContext, scheduleId: string) {
    const schedule = await this.findOne(ctx, scheduleId);

    if (!schedule.isActive) {
      throw new BadRequestException('Cannot generate work order for inactive schedule');
    }

    return this.generateWorkOrderFromSchedule(schedule, ctx.userId);
  }

  // Cron job to generate work orders
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledMaintenance() {
    this.logger.log('Processing scheduled maintenance...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active schedules where it's time to generate work orders
    const dueShedules = await this.prisma.maintenanceSchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: { not: null },
        OR: [
          // Due date is within lead time
          {
            nextDueDate: {
              lte: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000), // Max 90 days ahead
            },
          },
        ],
      },
      include: {
        tenant: true,
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });

    for (const schedule of dueShedules) {
      try {
        // Check if we should generate based on lead time
        const leadTimeDate = new Date(
          (schedule.nextDueDate as Date).getTime() - schedule.leadTimeDays * 24 * 60 * 60 * 1000,
        );

        if (today >= leadTimeDate) {
          // Check if end date hasn't passed
          if (schedule.endDate && schedule.nextDueDate && schedule.nextDueDate > schedule.endDate) {
            this.logger.log(`Schedule ${schedule.id} has passed end date, skipping`);
            continue;
          }

          // Check if work order already generated for this due date
          const existingWO = await this.prisma.scheduledWorkOrder.findFirst({
            where: {
              scheduleId: schedule.id,
              scheduledFor: schedule.nextDueDate as Date,
            },
          });

          if (existingWO) {
            this.logger.log(`Work order already exists for schedule ${schedule.id} on ${schedule.nextDueDate}`);
            continue;
          }

          await this.generateWorkOrderFromSchedule(schedule, null);
          this.logger.log(`Generated work order for schedule ${schedule.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to process schedule ${schedule.id}:`, error);
      }
    }
  }

  private async generateWorkOrderFromSchedule(
    schedule: {
      id: string;
      tenantId: string;
      name: string;
      description: string | null;
      assetId: string | null;
      locationId: string | null;
      priority: string;
      estimatedHours: number | null;
      assignedToId: string | null;
      workOrderTitle: string;
      workOrderType: string;
      nextDueDate: Date | null;
      frequency: string;
      interval: number;
      daysOfWeek: number[];
      dayOfMonth: number | null;
      monthOfYear: number | null;
      steps: Array<{
        stepOrder: number;
        title: string;
        description: string | null;
        isRequired: boolean;
      }>;
    },
    createdById: string | null,
  ) {
    // Generate work order number
    const workOrderNumber = await this.generateWorkOrderNumber(schedule.tenantId);

    // Create work order with steps
    const workOrder = await this.prisma.$transaction(async (tx) => {
      // Get system user or first admin if no creator specified
      let creator = createdById;
      if (!creator) {
        const adminUser = await tx.user.findFirst({
          where: {
            tenantId: schedule.tenantId,
            isActive: true,
            userRoles: {
              some: {
                role: { name: 'Admin' },
              },
            },
          },
        });
        creator = adminUser?.id || '';
      }

      const wo = await tx.workOrder.create({
        data: {
          tenantId: schedule.tenantId,
          workOrderNumber,
          title: schedule.workOrderTitle,
          description: schedule.description || `Scheduled maintenance: ${schedule.name}`,
          type: schedule.workOrderType,
          priority: schedule.priority,
          status: 'open',
          assetId: schedule.assetId,
          locationId: schedule.locationId,
          assignedToId: schedule.assignedToId,
          createdById: creator,
          dueDate: schedule.nextDueDate,
          estimatedHours: schedule.estimatedHours,
          steps: schedule.steps?.length
            ? {
                create: schedule.steps.map((step) => ({
                  tenantId: schedule.tenantId,
                  stepOrder: step.stepOrder,
                  title: step.title,
                  description: step.description,
                  isRequired: step.isRequired,
                })),
              }
            : undefined,
        },
      });

      // Link to schedule
      await tx.scheduledWorkOrder.create({
        data: {
          scheduleId: schedule.id,
          workOrderId: wo.id,
          scheduledFor: schedule.nextDueDate as Date,
        },
      });

      // Update schedule with next due date
      const newNextDueDate = this.calculateNextDueDate(
        schedule.nextDueDate as Date,
        schedule.frequency as ScheduleFrequency,
        schedule.interval,
        schedule.daysOfWeek,
        schedule.dayOfMonth,
        schedule.monthOfYear,
      );

      await tx.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          lastGeneratedAt: new Date(),
          nextDueDate: newNextDueDate,
        },
      });

      return wo;
    });

    return workOrder;
  }

  private async generateWorkOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const lastWO = await this.prisma.workOrder.findFirst({
      where: {
        tenantId,
        workOrderNumber: { startsWith: `WO-${year}` },
      },
      orderBy: { createdAt: 'desc' },
      select: { workOrderNumber: true },
    });

    let nextNumber = 1;
    if (lastWO?.workOrderNumber) {
      const match = lastWO.workOrderNumber.match(/WO-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `WO-${year}-${nextNumber.toString().padStart(4, '0')}`;
  }

  private calculateNextDueDate(
    fromDate: Date,
    frequency: ScheduleFrequency,
    interval: number,
    daysOfWeek?: number[],
    dayOfMonth?: number | null,
    monthOfYear?: number | null,
  ): Date {
    const date = new Date(fromDate);
    date.setHours(0, 0, 0, 0);

    switch (frequency) {
      case ScheduleFrequency.DAILY:
        date.setDate(date.getDate() + interval);
        break;

      case ScheduleFrequency.WEEKLY:
        date.setDate(date.getDate() + 7 * interval);
        // Adjust to specific day of week if specified
        if (daysOfWeek?.length) {
          const currentDay = date.getDay();
          const targetDay = daysOfWeek.find((d) => d >= currentDay) ?? daysOfWeek[0];
          const daysToAdd = targetDay >= currentDay
            ? targetDay - currentDay
            : 7 - currentDay + targetDay;
          date.setDate(date.getDate() + daysToAdd);
        }
        break;

      case ScheduleFrequency.BIWEEKLY:
        date.setDate(date.getDate() + 14 * interval);
        break;

      case ScheduleFrequency.MONTHLY:
        date.setMonth(date.getMonth() + interval);
        if (dayOfMonth) {
          const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
          date.setDate(Math.min(dayOfMonth, lastDayOfMonth));
        }
        break;

      case ScheduleFrequency.QUARTERLY:
        date.setMonth(date.getMonth() + 3 * interval);
        if (dayOfMonth) {
          const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
          date.setDate(Math.min(dayOfMonth, lastDayOfMonth));
        }
        break;

      case ScheduleFrequency.YEARLY:
        date.setFullYear(date.getFullYear() + interval);
        if (monthOfYear) {
          date.setMonth(monthOfYear - 1);
        }
        if (dayOfMonth) {
          const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
          date.setDate(Math.min(dayOfMonth, lastDayOfMonth));
        }
        break;

      case ScheduleFrequency.CUSTOM:
        // For custom, just add the interval in days
        date.setDate(date.getDate() + interval);
        break;
    }

    return date;
  }

  async getUpcomingSchedules(ctx: TenantContext, days: number = 30) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // Build team filter (user can only see schedules from their teams or shared)
    const teamFilter = buildTeamFilter(ctx);

    return this.prisma.maintenanceSchedule.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...teamFilter,
        isActive: true,
        nextDueDate: {
          lte: endDate,
          not: null,
        },
      },
      orderBy: { nextDueDate: 'asc' },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        location: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true, color: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
