import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let _prismaService: PrismaService;

  const mockTenantContext: TenantContext = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    email: 'test@example.com',
    permissions: ['work_orders:create', 'work_orders:update'],
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

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
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
        status: 'completed',
        completedAt: new Date(),
        version: 2,
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
        status: 'in_progress',
        startedAt: new Date(),
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
        tenantId: mockTenantContext.tenantId,
        steps: [{ id: stepId, title: 'Test Step' }],
        comments: [],
        photos: [],
        laborEntries: [],
        partsUsed: [],
        signatures: [],
      });

      mockPrismaService.workOrderStep.update.mockResolvedValue({
        id: stepId,
        isCompleted: true,
        completedById: mockTenantContext.userId,
        completedAt: new Date(),
      });

      await service.completeStep(
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
      });
    });
  });
});
