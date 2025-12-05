import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

describe('RolesService', () => {
  let service: RolesService;

  const mockTenantContext: TenantContext = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    email: 'admin@example.com',
    permissions: ['roles:read', 'roles:create', 'roles:update', 'roles:delete'],
    teamIds: ['team-123'],
    primaryTeamId: 'team-123',
    isAdmin: true,
  };

  const mockRole = {
    id: 'role-123',
    tenantId: 'tenant-123',
    name: 'Technician',
    description: 'Field technician role',
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPermission = {
    id: 'perm-123',
    resource: 'work_orders',
    action: 'read',
    description: 'Read work orders',
  };

  const mockRoleWithPermissions = {
    ...mockRole,
    rolePermissions: [
      {
        roleId: mockRole.id,
        permissionId: mockPermission.id,
        permission: mockPermission,
      },
    ],
    _count: { userRoles: 5 },
  };

  const mockPrismaService = {
    role: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all roles in tenant', async () => {
      mockPrismaService.role.findMany.mockResolvedValue([mockRoleWithPermissions]);

      const result = await service.findAll(mockTenantContext);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockRole.id);
      expect(result[0]).toHaveProperty('name', mockRole.name);
      expect(result[0]).toHaveProperty('userCount', 5);
      expect(result[0].permissions).toContain('work_orders:read');
      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantContext.tenantId },
        }),
      );
    });

    it('should return roles ordered by name', async () => {
      mockPrismaService.role.findMany.mockResolvedValue([]);

      await service.findAll(mockTenantContext);

      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a single role with permissions', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(mockRoleWithPermissions);

      const result = await service.findById(mockTenantContext, 'role-123');

      expect(result).toHaveProperty('id', mockRole.id);
      expect(result).toHaveProperty('name', mockRole.name);
      expect(result).toHaveProperty('isSystem', false);
      expect(result).toHaveProperty('userCount', 5);
      expect(result.permissions).toContain('work_orders:read');
      expect(result.permissionIds).toContain(mockPermission.id);
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(mockTenantContext, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findById(mockTenantContext, 'nonexistent'),
      ).rejects.toThrow('Role not found');
    });

    it('should enforce tenant isolation', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await service.findById(mockTenantContext, 'role-123').catch(() => {});

      expect(mockPrismaService.role.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'role-123', tenantId: mockTenantContext.tenantId },
        }),
      );
    });
  });

  describe('findAllPermissions', () => {
    it('should return all available permissions', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([mockPermission]);

      const result = await service.findAllPermissions();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockPermission.id,
        resource: mockPermission.resource,
        action: mockPermission.action,
        description: mockPermission.description,
      });
    });

    it('should return permissions ordered by resource and action', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      await service.findAllPermissions();

      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      });
    });
  });

  describe('create', () => {
    const createData = {
      name: 'Supervisor',
      description: 'Supervisor role with elevated permissions',
      permissionIds: ['perm-123'],
    };

    it('should create a new role successfully', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);
      mockPrismaService.permission.findMany.mockResolvedValue([mockPermission]);
      mockPrismaService.role.create.mockResolvedValue({
        ...mockRole,
        ...createData,
        id: 'new-role-123',
        rolePermissions: [
          {
            roleId: 'new-role-123',
            permissionId: 'perm-123',
            permission: mockPermission,
          },
        ],
        _count: { userRoles: 0 },
      });

      const result = await service.create(mockTenantContext, createData);

      expect(result).toHaveProperty('name', createData.name);
      expect(result).toHaveProperty('description', createData.description);
      expect(result).toHaveProperty('isSystem', false);
    });

    it('should throw ConflictException if role name already exists', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);

      await expect(
        service.create(mockTenantContext, createData),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create(mockTenantContext, createData),
      ).rejects.toThrow('A role with this name already exists');
    });

    it('should throw BadRequestException for invalid permission IDs', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);
      mockPrismaService.permission.findMany.mockResolvedValue([]); // No permissions found

      await expect(
        service.create(mockTenantContext, createData),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockTenantContext, createData),
      ).rejects.toThrow('One or more invalid permission IDs');
    });

    it('should create role without permissions', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);
      mockPrismaService.role.create.mockResolvedValue({
        ...mockRole,
        name: 'Basic Role',
        rolePermissions: [],
        _count: { userRoles: 0 },
      });

      const result = await service.create(mockTenantContext, {
        name: 'Basic Role',
      });

      expect(result.permissions).toEqual([]);
    });
  });

  describe('update', () => {
    const updateData = {
      name: 'Senior Technician',
      description: 'Updated description',
    };

    it('should update role successfully', async () => {
      mockPrismaService.role.findFirst
        .mockResolvedValueOnce(mockRole) // First call: find the role to update
        .mockResolvedValueOnce(null); // Second call: check name uniqueness (no conflict)
      mockPrismaService.role.update.mockResolvedValue({
        ...mockRoleWithPermissions,
        ...updateData,
      });

      const result = await service.update(
        mockTenantContext,
        'role-123',
        updateData,
      );

      expect(result).toHaveProperty('name', updateData.name);
      expect(result).toHaveProperty('description', updateData.description);
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockTenantContext, 'nonexistent', updateData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updating system role', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue({
        ...mockRole,
        isSystem: true,
      });

      await expect(
        service.update(mockTenantContext, 'role-123', updateData),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(mockTenantContext, 'role-123', updateData),
      ).rejects.toThrow('System roles cannot be modified');
    });

    it('should throw ConflictException if name already exists', async () => {
      mockPrismaService.role.findFirst
        .mockResolvedValueOnce(mockRole) // First: find the role to update
        .mockResolvedValueOnce({ id: 'other-role', name: 'Taken' }); // Second: check name uniqueness

      await expect(
        service.update(mockTenantContext, 'role-123', { name: 'Taken' }),
      ).rejects.toThrow('A role with this name already exists');
    });

    it('should allow keeping same name', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.role.update.mockResolvedValue(mockRoleWithPermissions);

      await service.update(mockTenantContext, 'role-123', {
        name: mockRole.name, // Same name
      });

      // Should not check for name uniqueness if name unchanged
      expect(mockPrismaService.role.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should delete role successfully', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue({
        ...mockRole,
        _count: { userRoles: 0 },
      });
      mockPrismaService.role.delete.mockResolvedValue(mockRole);

      const result = await service.delete(mockTenantContext, 'role-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({
        where: { id: 'role-123' },
      });
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(mockTenantContext, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deleting system role', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue({
        ...mockRole,
        isSystem: true,
        _count: { userRoles: 0 },
      });

      await expect(
        service.delete(mockTenantContext, 'role-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.delete(mockTenantContext, 'role-123'),
      ).rejects.toThrow('System roles cannot be deleted');
    });

    it('should throw BadRequestException when role has assigned users', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue({
        ...mockRole,
        _count: { userRoles: 5 },
      });

      await expect(
        service.delete(mockTenantContext, 'role-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.delete(mockTenantContext, 'role-123'),
      ).rejects.toThrow('Cannot delete role that is assigned to 5 user(s)');
    });
  });

  describe('assignPermissions', () => {
    const permissionIds = ['perm-123', 'perm-456'];

    it('should assign permissions to role', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(mockRoleWithPermissions);
      mockPrismaService.permission.findMany.mockResolvedValue([
        mockPermission,
        { ...mockPermission, id: 'perm-456', action: 'update' },
      ]);
      mockPrismaService.$transaction.mockResolvedValue([
        { count: 1 },
        { count: 2 },
      ]);

      const result = await service.assignPermissions(
        mockTenantContext,
        'role-123',
        permissionIds,
      );

      expect(result).toHaveProperty('id', mockRole.id);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(
        service.assignPermissions(mockTenantContext, 'nonexistent', permissionIds),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for system role', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue({
        ...mockRole,
        isSystem: true,
      });

      await expect(
        service.assignPermissions(mockTenantContext, 'role-123', permissionIds),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignPermissions(mockTenantContext, 'role-123', permissionIds),
      ).rejects.toThrow('System role permissions cannot be modified');
    });

    it('should throw BadRequestException for invalid permission IDs', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.permission.findMany.mockResolvedValue([mockPermission]); // Only 1 of 2 found

      await expect(
        service.assignPermissions(mockTenantContext, 'role-123', permissionIds),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignPermissions(mockTenantContext, 'role-123', permissionIds),
      ).rejects.toThrow('One or more invalid permission IDs');
    });
  });
});
