import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let _prismaService: PrismaService;

  const mockTenantContext: TenantContext = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    email: 'test@example.com',
    permissions: ['work_orders:create', 'work_orders:update'],
    teamIds: ['team-123'],
    primaryTeamId: 'team-123',
    isAdmin: false,
  };

  const mockPrismaService = {
    workOrder: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    workOrderStep: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    workOrderComment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    workOrderLabor: {
      create: jest.fn(),
      update: jest.fn(),
    },
    workOrderPart: {
      create: jest.fn(),
    },
    workOrderPhoto: {
      create: jest.fn(),
    },
    inventoryItem: {
      update: jest.fn(),
    },
    inventoryTransaction: {
      create: jest.fn(),
    },
  };

  const mockNotificationsService = {
    sendNotification: jest.fn(),
    sendWorkOrderAssignment: jest.fn(),
    sendWorkOrderStatusChange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<WorkOrdersService>(WorkOrdersService);
    _prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('complete', () => {
    const workOrderId = 'wo-123';

    it('should throw BadRequestException if required steps are incomplete', async () => {
      // Setup: incomplete required steps exist
      mockPrismaService.workOrderStep.findMany.mockResolvedValue([
        { id: 'step-1', title: 'Safety Check', isRequired: true, isCompleted: false },
        { id: 'step-2', title: 'Final Inspection', isRequired: true, isCompleted: false },
      ]);

      await expect(
        service.complete(mockTenantContext, workOrderId, {
          completionNotes: 'Done',
          expectedVersion: 1,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.workOrder.updateMany).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on version mismatch (optimistic locking)', async () => {
      // Setup: no incomplete steps
      mockPrismaService.workOrderStep.findMany.mockResolvedValue([]);
      // Update returns 0 count (version mismatch)
      mockPrismaService.workOrder.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.complete(mockTenantContext, workOrderId, {
          completionNotes: 'Done',
          expectedVersion: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should complete work order when all conditions are met', async () => {
      // Setup: no incomplete steps
      mockPrismaService.workOrderStep.findMany.mockResolvedValue([]);
      // Update succeeds
      mockPrismaService.workOrder.updateMany.mockResolvedValue({ count: 1 });
      // findById returns the updated work order
      mockPrismaService.workOrder.findFirst.mockResolvedValue({
        id: workOrderId,
        workOrderNumber: 'WO-2025-0001',
        title: 'Test WO',
        description: 'Test description',
        status: 'completed',
        priority: 'medium',
        type: 'reactive',
        dueDate: null,
        estimatedHours: null,
        startedAt: new Date(),
        completedAt: new Date(),
        completionNotes: 'All tasks finished',
        actualHours: 4,
        version: 2,
        tenantId: mockTenantContext.tenantId,
        assetId: null,
        locationId: null,
        assignedToId: null,
        createdById: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        asset: null,
        location: null,
        assignedTo: null,
        createdBy: { id: 'user-456', firstName: 'Creator', lastName: 'User' },
        steps: [],
        comments: [],
        photos: [],
        laborEntries: [],
        partsUsed: [],
        signatures: [],
      });

      const result = await service.complete(mockTenantContext, workOrderId, {
        completionNotes: 'All tasks finished',
        actualHours: 4,
        expectedVersion: 1,
      });

      expect(mockPrismaService.workOrder.updateMany).toHaveBeenCalledWith({
        where: {
          id: workOrderId,
          tenantId: mockTenantContext.tenantId,
          version: 1,
        },
        data: expect.objectContaining({
          status: 'completed',
          completionNotes: 'All tasks finished',
          actualHours: 4,
        }),
      });
      expect(result.status).toBe('completed');
    });
  });

  describe('start', () => {
    it('should update work order status to in_progress', async () => {
      const workOrderId = 'wo-123';

      mockPrismaService.workOrder.update.mockResolvedValue({});
      mockPrismaService.workOrder.findFirst.mockResolvedValue({
        id: workOrderId,
        workOrderNumber: 'WO-2025-0001',
        title: 'Test WO',
        description: 'Test description',
        status: 'in_progress',
        priority: 'medium',
        type: 'reactive',
        dueDate: null,
        estimatedHours: null,
        startedAt: new Date(),
        completedAt: null,
        completionNotes: null,
        actualHours: null,
        version: 1,
        tenantId: mockTenantContext.tenantId,
        assetId: null,
        locationId: null,
        assignedToId: null,
        createdById: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        asset: null,
        location: null,
        assignedTo: null,
        createdBy: { id: 'user-456', firstName: 'Creator', lastName: 'User' },
        steps: [],
        comments: [],
        photos: [],
        laborEntries: [],
        partsUsed: [],
        signatures: [],
      });

      const result = await service.start(mockTenantContext, workOrderId);

      expect(mockPrismaService.workOrder.update).toHaveBeenCalledWith({
        where: { id: workOrderId },
        data: expect.objectContaining({
          status: 'in_progress',
          startedAt: expect.any(Date),
        }),
      });
      expect(result.status).toBe('in_progress');
    });
  });

  describe('completeStep', () => {
    it('should mark step as completed with user and timestamp', async () => {
      const workOrderId = 'wo-123';
      const stepId = 'step-456';

      // Mock findById to verify access
      mockPrismaService.workOrder.findFirst.mockResolvedValue({
        id: workOrderId,
        workOrderNumber: 'WO-2025-0001',
        title: 'Test WO',
        description: 'Test description',
        status: 'in_progress',
        priority: 'medium',
        type: 'reactive',
        dueDate: null,
        estimatedHours: null,
        startedAt: new Date(),
        completedAt: null,
        completionNotes: null,
        actualHours: null,
        version: 1,
        tenantId: mockTenantContext.tenantId,
        assetId: null,
        locationId: null,
        assignedToId: null,
        createdById: 'user-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        asset: null,
        location: null,
        assignedTo: null,
        createdBy: { id: 'user-456', firstName: 'Creator', lastName: 'User' },
        steps: [{
          id: stepId,
          title: 'Test Step',
          stepOrder: 1,
          isRequired: true,
          isCompleted: false,
          completedBy: null,
          completedAt: null,
          completionNotes: null,
        }],
        comments: [],
        photos: [],
        laborEntries: [],
        partsUsed: [],
        signatures: [],
      });

      // Mock step findFirst
      mockPrismaService.workOrderStep.findFirst.mockResolvedValue({
        id: stepId,
        workOrderId,
        stepOrder: 1,
        title: 'Test Step',
        description: null,
        isRequired: true,
        isCompleted: false,
        completedById: null,
        completedAt: null,
        completionNotes: null,
      });

      mockPrismaService.workOrderStep.update.mockResolvedValue({
        id: stepId,
        workOrderId,
        stepOrder: 1,
        title: 'Test Step',
        description: null,
        isRequired: true,
        isCompleted: true,
        completedById: mockTenantContext.userId,
        completedAt: new Date(),
        completionNotes: 'Step done',
        completedBy: { id: mockTenantContext.userId, firstName: 'Test', lastName: 'User' },
      });

      const result = await service.completeStep(
        mockTenantContext,
        workOrderId,
        stepId,
        { completionNotes: 'Step done' },
      );

      expect(mockPrismaService.workOrderStep.update).toHaveBeenCalledWith({
        where: { id: stepId },
        data: expect.objectContaining({
          isCompleted: true,
          completedById: mockTenantContext.userId,
          completedAt: expect.any(Date),
          completionNotes: 'Step done',
        }),
        include: expect.any(Object),
      });
      expect(result.isCompleted).toBe(true);
    });
  });
});
