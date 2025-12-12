import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockTenantContext: TenantContext = {
    userId: 'current-user-123',
    tenantId: 'tenant-123',
    email: 'admin@example.com',
    permissions: ['users:read', 'users:create', 'users:update', 'users:delete'],
    teamIds: ['team-123'],
    primaryTeamId: 'team-123',
    isAdmin: true,
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-1234',
    avatarUrl: null,
    isActive: true,
    roles: [{ id: 'role-123', name: 'Technician' }],
    teams: [{ id: 'team-123', name: 'Engineering', code: 'ENG', color: '#0000FF', isPrimary: true, role: 'member' }],
    primaryTeamId: 'team-123',
    lastLoginAt: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  const mockUserTeam = {
    id: 'team-123',
    name: 'Engineering',
    code: 'ENG',
    color: '#0000FF',
    description: 'Engineering team',
    isPrimary: true,
    role: 'member',
    joinedAt: new Date(),
  };

  const mockUsersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updatePassword: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
    assignRoles: jest.fn(),
    getUserTeams: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      const paginatedResult = {
        data: [mockUser],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockUsersService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(mockTenantContext, 1, 20, undefined);

      expect(result).toEqual(paginatedResult);
      expect(usersService.findAll).toHaveBeenCalledWith(mockTenantContext, {
        page: 1,
        limit: 20,
        search: undefined,
      });
    });

    it('should pass search parameter to service', async () => {
      mockUsersService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(mockTenantContext, 1, 20, 'john');

      expect(usersService.findAll).toHaveBeenCalledWith(mockTenantContext, {
        page: 1,
        limit: 20,
        search: 'john',
      });
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockTenantContext, 'user-123');

      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith(
        mockTenantContext,
        'user-123',
      );
    });
  });

  describe('create', () => {
    const createDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '555-5678',
      primaryTeamId: 'team-123',
      roleIds: ['role-123'],
    };

    it('should create a new user', async () => {
      const createdUser = { ...mockUser, ...createDto, id: 'new-user-123' };
      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await controller.create(mockTenantContext, createDto);

      expect(result).toEqual(createdUser);
      expect(usersService.create).toHaveBeenCalledWith(
        mockTenantContext,
        createDto,
      );
    });
  });

  describe('update', () => {
    const updateBody = {
      firstName: 'Johnny',
      lastName: 'Updated',
    };

    it('should update a user', async () => {
      const updatedUser = { ...mockUser, ...updateBody };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        mockTenantContext,
        'user-123',
        updateBody,
      );

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith(
        mockTenantContext,
        'user-123',
        updateBody,
      );
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockUsersService.updatePassword.mockResolvedValue({ success: true });

      const result = await controller.updatePassword(
        mockTenantContext,
        'user-123',
        { password: 'NewPass456!' },
      );

      expect(result).toEqual({ success: true });
      expect(usersService.updatePassword).toHaveBeenCalledWith(
        mockTenantContext,
        'user-123',
        'NewPass456!',
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user', async () => {
      mockUsersService.deactivate.mockResolvedValue({ success: true });

      const result = await controller.deactivate(mockTenantContext, 'user-123');

      expect(result).toEqual({ success: true });
      expect(usersService.deactivate).toHaveBeenCalledWith(
        mockTenantContext,
        'user-123',
      );
    });
  });

  describe('activate', () => {
    it('should activate a user', async () => {
      mockUsersService.activate.mockResolvedValue({ success: true });

      const result = await controller.activate(mockTenantContext, 'user-123');

      expect(result).toEqual({ success: true });
      expect(usersService.activate).toHaveBeenCalledWith(
        mockTenantContext,
        'user-123',
      );
    });
  });

  describe('assignRoles', () => {
    it('should assign roles to a user', async () => {
      const userWithNewRoles = {
        ...mockUser,
        roles: [
          { id: 'role-123', name: 'Technician' },
          { id: 'role-456', name: 'Supervisor' },
        ],
      };
      mockUsersService.assignRoles.mockResolvedValue(userWithNewRoles);

      const result = await controller.assignRoles(mockTenantContext, 'user-123', {
        roleIds: ['role-123', 'role-456'],
      });

      expect(result).toEqual(userWithNewRoles);
      expect(usersService.assignRoles).toHaveBeenCalledWith(
        mockTenantContext,
        'user-123',
        ['role-123', 'role-456'],
      );
    });
  });

  describe('getMyTeams', () => {
    it('should return current user teams', async () => {
      mockUsersService.getUserTeams.mockResolvedValue([mockUserTeam]);

      const result = await controller.getMyTeams(mockTenantContext);

      expect(result).toEqual([mockUserTeam]);
      expect(usersService.getUserTeams).toHaveBeenCalledWith(
        mockTenantContext,
        mockTenantContext.userId,
      );
    });
  });

  describe('getUserTeams', () => {
    it('should return user teams for admin viewing any user', async () => {
      mockUsersService.getUserTeams.mockResolvedValue([mockUserTeam]);

      const result = await controller.getUserTeams(mockTenantContext, 'other-user-123');

      expect(result).toEqual([mockUserTeam]);
      expect(usersService.getUserTeams).toHaveBeenCalledWith(
        mockTenantContext,
        'other-user-123',
      );
    });

    it('should return user teams for user viewing own teams', async () => {
      const nonAdminContext: TenantContext = {
        ...mockTenantContext,
        isAdmin: false,
      };
      mockUsersService.getUserTeams.mockResolvedValue([mockUserTeam]);

      const result = await controller.getUserTeams(nonAdminContext, nonAdminContext.userId);

      expect(result).toEqual([mockUserTeam]);
      expect(usersService.getUserTeams).toHaveBeenCalledWith(
        nonAdminContext,
        nonAdminContext.userId,
      );
    });

    it('should throw ForbiddenException for non-admin viewing other user teams', async () => {
      const nonAdminContext: TenantContext = {
        ...mockTenantContext,
        isAdmin: false,
      };

      await expect(
        controller.getUserTeams(nonAdminContext, 'other-user-123'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.getUserTeams(nonAdminContext, 'other-user-123'),
      ).rejects.toThrow("Cannot view other users' teams");
    });
  });
});
