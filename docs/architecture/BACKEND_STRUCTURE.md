# TaskMaster CMMS - Backend Project Structure

## Overview

The backend follows a **modular monolith** architecture using NestJS 11. Each domain is encapsulated in its own module with clear boundaries, making future extraction to microservices straightforward.

---

## Directory Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Database seeding
│
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── worker.ts               # Background worker entry point
│   │
│   ├── common/                 # Shared utilities and infrastructure
│   │   ├── config/
│   │   │   ├── config.module.ts
│   │   │   ├── config.service.ts
│   │   │   └── config.schema.ts      # Zod validation for env vars
│   │   │
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── prisma.extension.ts   # Tenant isolation extension
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.guard.ts         # JWT validation guard
│   │   │   ├── tenant.guard.ts       # Tenant context guard
│   │   │   ├── permissions.guard.ts  # RBAC permission guard
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   ├── tenant-context.decorator.ts
│   │   │   │   └── permissions.decorator.ts
│   │   │   └── strategies/
│   │   │       ├── jwt.strategy.ts
│   │   │       └── refresh.strategy.ts
│   │   │
│   │   ├── exceptions/
│   │   │   ├── http-exception.filter.ts
│   │   │   ├── prisma-exception.filter.ts
│   │   │   └── domain-exceptions.ts  # Custom domain exceptions
│   │   │
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts  # Response formatting
│   │   │   └── timeout.interceptor.ts
│   │   │
│   │   ├── pipes/
│   │   │   ├── validation.pipe.ts
│   │   │   └── parse-uuid.pipe.ts
│   │   │
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   └── api-response.dto.ts
│   │   │
│   │   ├── types/
│   │   │   ├── tenant-context.type.ts
│   │   │   └── request.type.ts       # Extended Express Request
│   │   │
│   │   └── utils/
│   │       ├── crypto.util.ts        # Password hashing, tokens
│   │       ├── date.util.ts
│   │       └── string.util.ts
│   │
│   ├── modules/                # Domain modules
│   │   │
│   │   ├── tenants/
│   │   │   ├── tenants.module.ts
│   │   │   ├── tenants.controller.ts
│   │   │   ├── tenants.service.ts
│   │   │   ├── tenants.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-tenant.dto.ts
│   │   │   │   └── update-tenant.dto.ts
│   │   │   └── entities/
│   │   │       └── tenant.entity.ts  # Domain entity (not Prisma model)
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── user-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   └── events/
│   │   │       ├── user-created.event.ts
│   │   │       └── user-updated.event.ts
│   │   │
│   │   ├── roles/
│   │   │   ├── roles.module.ts
│   │   │   ├── roles.controller.ts
│   │   │   ├── roles.service.ts
│   │   │   ├── roles.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-role.dto.ts
│   │   │   │   ├── update-role.dto.ts
│   │   │   │   └── assign-permissions.dto.ts
│   │   │   └── constants/
│   │   │       └── permissions.constant.ts
│   │   │
│   │   ├── authentication/
│   │   │   ├── authentication.module.ts
│   │   │   ├── authentication.controller.ts
│   │   │   ├── authentication.service.ts
│   │   │   ├── token.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── refresh-token.dto.ts
│   │   │   │   └── auth-response.dto.ts
│   │   │   └── guards/
│   │   │       └── local-auth.guard.ts
│   │   │
│   │   ├── locations/
│   │   │   ├── locations.module.ts
│   │   │   ├── locations.controller.ts
│   │   │   ├── locations.service.ts
│   │   │   ├── locations.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-location.dto.ts
│   │   │   │   ├── update-location.dto.ts
│   │   │   │   └── location-tree.dto.ts
│   │   │   └── entities/
│   │   │       └── location.entity.ts
│   │   │
│   │   ├── assets/
│   │   │   ├── assets.module.ts
│   │   │   ├── assets.controller.ts
│   │   │   ├── assets.service.ts
│   │   │   ├── assets.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-asset.dto.ts
│   │   │   │   ├── update-asset.dto.ts
│   │   │   │   └── asset-filters.dto.ts
│   │   │   └── entities/
│   │   │       └── asset.entity.ts
│   │   │
│   │   ├── inventory/
│   │   │   ├── inventory.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── inventory-items.controller.ts
│   │   │   │   ├── inventory-stock.controller.ts
│   │   │   │   └── inventory-transactions.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── inventory-items.service.ts
│   │   │   │   ├── inventory-stock.service.ts
│   │   │   │   └── inventory-transactions.service.ts
│   │   │   ├── repositories/
│   │   │   │   ├── inventory-items.repository.ts
│   │   │   │   ├── inventory-stock.repository.ts
│   │   │   │   └── inventory-transactions.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-item.dto.ts
│   │   │   │   ├── adjust-stock.dto.ts
│   │   │   │   ├── transfer-stock.dto.ts
│   │   │   │   └── transaction-filters.dto.ts
│   │   │   └── entities/
│   │   │       ├── inventory-item.entity.ts
│   │   │       ├── inventory-stock.entity.ts
│   │   │       └── inventory-transaction.entity.ts
│   │   │
│   │   ├── work-orders/
│   │   │   ├── work-orders.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── work-orders.controller.ts
│   │   │   │   ├── work-order-steps.controller.ts
│   │   │   │   ├── work-order-comments.controller.ts
│   │   │   │   └── work-order-signatures.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── work-orders.service.ts
│   │   │   │   ├── work-order-steps.service.ts
│   │   │   │   ├── work-order-comments.service.ts
│   │   │   │   ├── work-order-signatures.service.ts
│   │   │   │   └── work-order-number.service.ts  # Generates WO-2024-001
│   │   │   ├── repositories/
│   │   │   │   ├── work-orders.repository.ts
│   │   │   │   ├── work-order-steps.repository.ts
│   │   │   │   └── work-order-comments.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-work-order.dto.ts
│   │   │   │   ├── update-work-order.dto.ts
│   │   │   │   ├── complete-work-order.dto.ts
│   │   │   │   ├── work-order-filters.dto.ts
│   │   │   │   ├── create-step.dto.ts
│   │   │   │   ├── create-comment.dto.ts
│   │   │   │   └── create-signature.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── work-order.entity.ts
│   │   │   │   ├── work-order-step.entity.ts
│   │   │   │   ├── work-order-comment.entity.ts
│   │   │   │   └── work-order-signature.entity.ts
│   │   │   ├── events/
│   │   │   │   ├── work-order-created.event.ts
│   │   │   │   ├── work-order-assigned.event.ts
│   │   │   │   ├── work-order-completed.event.ts
│   │   │   │   └── work-order-commented.event.ts
│   │   │   └── constants/
│   │   │       ├── work-order-status.constant.ts
│   │   │       └── work-order-priority.constant.ts
│   │   │
│   │   ├── scheduling/
│   │   │   ├── scheduling.module.ts
│   │   │   ├── scheduling.controller.ts
│   │   │   ├── scheduling.service.ts
│   │   │   ├── schedule-generator.service.ts  # Generates WOs from schedules
│   │   │   ├── repositories/
│   │   │   │   └── schedules.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-schedule.dto.ts
│   │   │   │   ├── update-schedule.dto.ts
│   │   │   │   └── schedule-filters.dto.ts
│   │   │   └── entities/
│   │   │       └── schedule.entity.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notification-preferences.service.ts
│   │   │   ├── channels/
│   │   │   │   ├── email.channel.ts
│   │   │   │   ├── push.channel.ts
│   │   │   │   └── in-app.channel.ts
│   │   │   ├── templates/
│   │   │   │   ├── work-order-assigned.template.ts
│   │   │   │   ├── work-order-completed.template.ts
│   │   │   │   └── schedule-due.template.ts
│   │   │   ├── dto/
│   │   │   │   ├── notification-preferences.dto.ts
│   │   │   │   └── mark-read.dto.ts
│   │   │   └── entities/
│   │   │       ├── notification.entity.ts
│   │   │       └── notification-preference.entity.ts
│   │   │
│   │   ├── storage/
│   │   │   ├── storage.module.ts
│   │   │   ├── storage.controller.ts
│   │   │   ├── storage.service.ts
│   │   │   ├── providers/
│   │   │   │   ├── storage-provider.interface.ts
│   │   │   │   ├── local.provider.ts
│   │   │   │   └── s3.provider.ts
│   │   │   ├── dto/
│   │   │   │   └── upload.dto.ts
│   │   │   └── entities/
│   │   │       └── attachment.entity.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── aggregators/
│   │   │   │   ├── work-order-metrics.aggregator.ts
│   │   │   │   └── user-activity.aggregator.ts
│   │   │   └── dto/
│   │   │       ├── dashboard-metrics.dto.ts
│   │   │       └── date-range.dto.ts
│   │   │
│   │   └── audit/
│   │       ├── audit.module.ts
│   │       ├── audit.service.ts
│   │       ├── audit.interceptor.ts      # Captures changes
│   │       ├── audit.repository.ts
│   │       └── entities/
│   │           └── audit-log.entity.ts
│   │
│   ├── jobs/                    # Background job processors
│   │   ├── jobs.module.ts
│   │   ├── processors/
│   │   │   ├── notification.processor.ts
│   │   │   ├── scheduling.processor.ts
│   │   │   ├── report.processor.ts
│   │   │   └── cleanup.processor.ts
│   │   └── queues/
│   │       └── queue.constants.ts
│   │
│   └── health/                  # Health checks
│       ├── health.module.ts
│       └── health.controller.ts
│
├── test/
│   ├── app.e2e-spec.ts
│   ├── jest-e2e.json
│   ├── fixtures/                # Test data factories
│   │   ├── tenant.fixture.ts
│   │   ├── user.fixture.ts
│   │   └── work-order.fixture.ts
│   └── utils/
│       ├── test-database.ts     # Test DB setup/teardown
│       └── test-auth.ts         # Auth helpers for tests
│
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── Dockerfile
```

---

## Module Anatomy

Each domain module follows a consistent structure:

```
modules/work-orders/
├── work-orders.module.ts      # Module definition, imports, exports
├── controllers/               # HTTP layer (thin, delegates to services)
│   └── work-orders.controller.ts
├── services/                  # Business logic layer
│   └── work-orders.service.ts
├── repositories/              # Data access layer (Prisma queries)
│   └── work-orders.repository.ts
├── dto/                       # Data Transfer Objects (validation)
│   ├── create-work-order.dto.ts
│   └── update-work-order.dto.ts
├── entities/                  # Domain entities (business rules)
│   └── work-order.entity.ts
├── events/                    # Domain events (for async processing)
│   └── work-order-created.event.ts
└── constants/                 # Module-specific constants
    └── work-order-status.constant.ts
```

---

## Layer Responsibilities

### Controllers (HTTP Layer)

- Parse and validate request input
- Extract tenant context from request
- Delegate to services
- Transform response to DTOs
- Handle HTTP-specific concerns (status codes, headers)

```typescript
@Controller('work-orders')
@UseGuards(AuthGuard, TenantGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  @Permissions('work_orders:read')
  async findAll(
    @TenantContext() ctx: TenantContextType,
    @Query() filters: WorkOrderFiltersDto,
  ): Promise<PaginatedResponse<WorkOrderResponseDto>> {
    const result = await this.workOrdersService.findAll(ctx, filters);
    return {
      data: result.items.map(WorkOrderResponseDto.fromEntity),
      meta: result.meta,
    };
  }

  @Post()
  @Permissions('work_orders:create')
  async create(
    @TenantContext() ctx: TenantContextType,
    @Body() dto: CreateWorkOrderDto,
  ): Promise<WorkOrderResponseDto> {
    const workOrder = await this.workOrdersService.create(ctx, dto);
    return WorkOrderResponseDto.fromEntity(workOrder);
  }
}
```

### Services (Business Logic Layer)

- Implement business rules and workflows
- Orchestrate multiple repositories/services
- Emit domain events
- Handle transactions

```typescript
@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly repository: WorkOrdersRepository,
    private readonly stepsRepository: WorkOrderStepsRepository,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async complete(
    ctx: TenantContextType,
    id: string,
    dto: CompleteWorkOrderDto,
  ): Promise<WorkOrder> {
    // Use transaction for atomicity
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate all steps are completed
      const incompleteSteps = await this.stepsRepository.findIncomplete(ctx, id, tx);
      if (incompleteSteps.length > 0) {
        throw new BusinessRuleException('All steps must be completed');
      }

      // 2. Update work order status
      const workOrder = await this.repository.complete(ctx, id, dto, tx);

      // 3. Deduct inventory items used
      for (const item of dto.itemsUsed) {
        await this.inventoryService.deduct(ctx, item, id, tx);
      }

      // 4. Emit event for notifications
      this.eventEmitter.emit(
        'work-order.completed',
        new WorkOrderCompletedEvent(workOrder),
      );

      return workOrder;
    });
  }
}
```

### Repositories (Data Access Layer)

- Encapsulate all Prisma queries
- Always apply tenant scoping
- Return domain entities (not Prisma models)
- Handle query optimization

```typescript
@Injectable()
export class WorkOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    ctx: TenantContextType,
    filters: WorkOrderFiltersDto,
  ): Promise<PaginatedResult<WorkOrder>> {
    const where: Prisma.WorkOrderWhereInput = {
      tenantId: ctx.tenantId, // Always scoped
      ...(filters.status && { status: { in: filters.status } }),
      ...(filters.priority && { priority: { in: filters.priority } }),
      ...(filters.assignedToId && { assignedToId: filters.assignedToId }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { workOrderNumber: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        include: { asset: true, assignedTo: true, location: true },
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      items: items.map(WorkOrder.fromPrisma),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async complete(
    ctx: TenantContextType,
    id: string,
    dto: CompleteWorkOrderDto,
    tx?: Prisma.TransactionClient,
  ): Promise<WorkOrder> {
    const client = tx || this.prisma;

    const result = await client.workOrder.updateMany({
      where: {
        id,
        tenantId: ctx.tenantId,
        version: dto.expectedVersion, // Optimistic locking
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completionNotes: dto.notes,
        actualHours: dto.actualHours,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Work order was modified by another user');
    }

    return this.findById(ctx, id, tx);
  }
}
```

### Entities (Domain Layer)

- Contain business rules and invariants
- Transform between Prisma models and domain objects
- Encapsulate validation logic

```typescript
export class WorkOrder {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly workOrderNumber: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly status: WorkOrderStatus,
    public readonly priority: WorkOrderPriority,
    public readonly type: WorkOrderType,
    public readonly assetId: string | null,
    public readonly locationId: string | null,
    public readonly assignedToId: string | null,
    public readonly createdById: string,
    public readonly dueDate: Date | null,
    public readonly startedAt: Date | null,
    public readonly completedAt: Date | null,
    public readonly estimatedHours: number | null,
    public readonly actualHours: number | null,
    public readonly version: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    // Related entities
    public readonly asset?: Asset,
    public readonly location?: Location,
    public readonly assignedTo?: User,
    public readonly steps?: WorkOrderStep[],
  ) {}

  // Business rules
  get isOverdue(): boolean {
    if (!this.dueDate || this.status === 'completed') return false;
    return new Date() > this.dueDate;
  }

  get canBeCompleted(): boolean {
    return ['open', 'in_progress'].includes(this.status);
  }

  get canBeAssigned(): boolean {
    return this.status !== 'completed' && this.status !== 'cancelled';
  }

  // Factory method from Prisma model
  static fromPrisma(data: PrismaWorkOrder & {
    asset?: PrismaAsset;
    location?: PrismaLocation;
    assignedTo?: PrismaUser;
    steps?: PrismaWorkOrderStep[];
  }): WorkOrder {
    return new WorkOrder(
      data.id,
      data.tenantId,
      data.workOrderNumber,
      data.title,
      data.description,
      data.status as WorkOrderStatus,
      data.priority as WorkOrderPriority,
      data.type as WorkOrderType,
      data.assetId,
      data.locationId,
      data.assignedToId,
      data.createdById,
      data.dueDate,
      data.startedAt,
      data.completedAt,
      data.estimatedHours,
      data.actualHours,
      data.version,
      data.createdAt,
      data.updatedAt,
      data.asset ? Asset.fromPrisma(data.asset) : undefined,
      data.location ? Location.fromPrisma(data.location) : undefined,
      data.assignedTo ? User.fromPrisma(data.assignedTo) : undefined,
      data.steps?.map(WorkOrderStep.fromPrisma),
    );
  }
}
```

### DTOs (Data Transfer Objects)

- Validate input using class-validator
- Transform output for API responses
- Separate from domain entities

```typescript
// Input DTO with validation
export class CreateWorkOrderDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(WorkOrderPriority)
  priority: WorkOrderPriority;

  @IsEnum(WorkOrderType)
  type: WorkOrderType;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  estimatedHours?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderStepDto)
  steps?: CreateWorkOrderStepDto[];
}

// Output DTO for API responses
export class WorkOrderResponseDto {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  type: WorkOrderType;
  asset: AssetSummaryDto | null;
  location: LocationSummaryDto | null;
  assignedTo: UserSummaryDto | null;
  dueDate: string | null;
  isOverdue: boolean;
  estimatedHours: number | null;
  actualHours: number | null;
  stepsCount: number;
  stepsCompleted: number;
  createdAt: string;
  updatedAt: string;

  static fromEntity(entity: WorkOrder): WorkOrderResponseDto {
    return {
      id: entity.id,
      workOrderNumber: entity.workOrderNumber,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      type: entity.type,
      asset: entity.asset ? AssetSummaryDto.fromEntity(entity.asset) : null,
      location: entity.location ? LocationSummaryDto.fromEntity(entity.location) : null,
      assignedTo: entity.assignedTo ? UserSummaryDto.fromEntity(entity.assignedTo) : null,
      dueDate: entity.dueDate?.toISOString() ?? null,
      isOverdue: entity.isOverdue,
      estimatedHours: entity.estimatedHours,
      actualHours: entity.actualHours,
      stepsCount: entity.steps?.length ?? 0,
      stepsCompleted: entity.steps?.filter(s => s.isCompleted).length ?? 0,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
```

---

## Event-Driven Patterns

### Domain Events

```typescript
// Event definition
export class WorkOrderCompletedEvent {
  constructor(
    public readonly workOrder: WorkOrder,
    public readonly completedBy: string,
    public readonly completedAt: Date = new Date(),
  ) {}
}

// Event handler (in notifications module)
@Injectable()
export class WorkOrderEventHandler {
  constructor(
    private readonly notificationService: NotificationsService,
  ) {}

  @OnEvent('work-order.completed')
  async handleWorkOrderCompleted(event: WorkOrderCompletedEvent) {
    // Notify relevant users
    await this.notificationService.notifyWorkOrderCompleted(event.workOrder);
  }

  @OnEvent('work-order.assigned')
  async handleWorkOrderAssigned(event: WorkOrderAssignedEvent) {
    // Notify assigned user
    await this.notificationService.notifyWorkOrderAssigned(
      event.workOrder,
      event.assignedTo,
    );
  }
}
```

### Background Job Processors

```typescript
@Processor('notifications')
export class NotificationProcessor {
  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly pushChannel: PushChannel,
    private readonly inAppChannel: InAppChannel,
  ) {}

  @Process('send-notification')
  async handleSendNotification(job: Job<SendNotificationJob>) {
    const { userId, tenantId, template, data, channels } = job.data;

    const results = await Promise.allSettled(
      channels.map(async (channel) => {
        switch (channel) {
          case 'email':
            return this.emailChannel.send(userId, template, data);
          case 'push':
            return this.pushChannel.send(userId, template, data);
          case 'in_app':
            return this.inAppChannel.send(userId, tenantId, template, data);
        }
      }),
    );

    // Log failures for retry
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      throw new Error(`Failed to send to ${failures.length} channels`);
    }
  }
}
```

---

## Configuration Management

### Environment Validation

```typescript
// config/config.schema.ts
import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // Storage
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  STORAGE_PATH: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof configSchema>;
```

### Config Service

```typescript
@Injectable()
export class ConfigService {
  private readonly config: Config;

  constructor() {
    const result = configSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Invalid configuration:', result.error.format());
      throw new Error('Invalid environment configuration');
    }
    this.config = result.data;
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// work-orders.service.spec.ts
describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let repository: MockType<WorkOrdersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: WorkOrdersRepository, useFactory: mockRepository },
        { provide: PrismaService, useFactory: mockPrismaService },
      ],
    }).compile();

    service = module.get(WorkOrdersService);
    repository = module.get(WorkOrdersRepository);
  });

  describe('complete', () => {
    it('should throw if steps are incomplete', async () => {
      repository.findIncompleteSteps.mockResolvedValue([{ id: '1' }]);

      await expect(
        service.complete(mockContext, 'wo-1', { notes: 'Done' }),
      ).rejects.toThrow(BusinessRuleException);
    });

    it('should complete work order and deduct inventory', async () => {
      repository.findIncompleteSteps.mockResolvedValue([]);
      repository.complete.mockResolvedValue(mockWorkOrder);

      const result = await service.complete(mockContext, 'wo-1', {
        notes: 'Done',
        itemsUsed: [{ itemId: 'inv-1', quantity: 2 }],
      });

      expect(result.status).toBe('completed');
      expect(inventoryService.deduct).toHaveBeenCalledWith(
        mockContext,
        { itemId: 'inv-1', quantity: 2 },
        'wo-1',
        expect.any(Object),
      );
    });
  });
});
```

### Integration Tests

```typescript
// work-orders.e2e-spec.ts
describe('WorkOrders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    authToken = await getTestAuthToken(app);
  });

  afterAll(async () => {
    await prisma.$executeRaw`TRUNCATE work_orders CASCADE`;
    await app.close();
  });

  describe('POST /work-orders', () => {
    it('should create a work order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Fix HVAC Unit',
          priority: 'high',
          type: 'reactive',
        })
        .expect(201);

      expect(response.body.data.workOrderNumber).toMatch(/^WO-\d{4}-\d+$/);
      expect(response.body.data.status).toBe('open');
    });
  });
});
```
