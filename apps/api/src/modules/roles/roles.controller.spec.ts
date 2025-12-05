import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: RolesService;

  const mockTenantContext: TenantContext = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    email: 'admin@example.com',
    permissions: ['roles:read', 'roles:create', 'roles:update', 'roles:delete'],
  };

  const mockRole = {
    id: 'role-123',
    name: 'Technician',
    description: 'Field technician role',
    isSystem: false,
    userCount: 5,
    permissions: ['work_orders:read', 'work_orders:update'],
    permissionIds: ['perm-1', 'perm-2'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const mockPermission = {
    id: 'perm-123',
    resource: 'work_orders',
    action: 'read',
    description: 'Read work orders',
  };

  const mockRolesService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findAllPermissions: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    assignPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: mockRolesService }],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    rolesService = module.get<RolesService>(RolesService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      mockRolesService.findAll.mockResolvedValue([mockRole]);

      const result = await controller.findAll(mockTenantContext);

      expect(result).toEqual([mockRole]);
      expect(rolesService.findAll).toHaveBeenCalledWith(mockTenantContext);
    });
  });

  describe('findAllPermissions', () => {
    it('should return all available permissions', async () => {
      mockRolesService.findAllPermissions.mockResolvedValue([mockPermission]);

      const result = await controller.findAllPermissions();

      expect(result).toEqual([mockPermission]);
      expect(rolesService.findAllPermissions).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single role', async () => {
      mockRolesService.findById.mockResolvedValue(mockRole);

      const result = await controller.findOne(mockTenantContext, 'role-123');

      expect(result).toEqual(mockRole);
      expect(rolesService.findById).toHaveBeenCalledWith(
        mockTenantContext,
        'role-123',
      );
    });
  });

  describe('create', () => {
    const createBody = {
      name: 'Supervisor',
      description: 'Supervisor role',
      permissionIds: ['perm-1', 'perm-2'],
    };

    it('should create a new role', async () => {
      const createdRole = { ...mockRole, ...createBody, id: 'new-role-123' };
      mockRolesService.create.mockResolvedValue(createdRole);

      const result = await controller.create(mockTenantContext, createBody);

      expect(result).toEqual(createdRole);
      expect(rolesService.create).toHaveBeenCalledWith(
        mockTenantContext,
        createBody,
      );
    });
  });

  describe('update', () => {
    const updateBody = {
      name: 'Senior Technician',
      description: 'Updated description',
    };

    it('should update a role', async () => {
      const updatedRole = { ...mockRole, ...updateBody };
      mockRolesService.update.mockResolvedValue(updatedRole);

      const result = await controller.update(
        mockTenantContext,
        'role-123',
        updateBody,
      );

      expect(result).toEqual(updatedRole);
      expect(rolesService.update).toHaveBeenCalledWith(
        mockTenantContext,
        'role-123',
        updateBody,
      );
    });
  });

  describe('delete', () => {
    it('should delete a role', async () => {
      mockRolesService.delete.mockResolvedValue({ success: true });

      const result = await controller.delete(mockTenantContext, 'role-123');

      expect(result).toEqual({ success: true });
      expect(rolesService.delete).toHaveBeenCalledWith(
        mockTenantContext,
        'role-123',
      );
    });
  });

  describe('assignPermissions', () => {
    it('should assign permissions to a role', async () => {
      const roleWithNewPermissions = {
        ...mockRole,
        permissions: ['work_orders:read', 'work_orders:update', 'work_orders:delete'],
        permissionIds: ['perm-1', 'perm-2', 'perm-3'],
      };
      mockRolesService.assignPermissions.mockResolvedValue(roleWithNewPermissions);

      const result = await controller.assignPermissions(
        mockTenantContext,
        'role-123',
        { permissionIds: ['perm-1', 'perm-2', 'perm-3'] },
      );

      expect(result).toEqual(roleWithNewPermissions);
      expect(rolesService.assignPermissions).toHaveBeenCalledWith(
        mockTenantContext,
        'role-123',
        ['perm-1', 'perm-2', 'perm-3'],
      );
    });
  });
});
