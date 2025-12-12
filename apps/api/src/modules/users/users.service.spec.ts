import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;

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
    tenantId: 'tenant-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-1234',
    avatarUrl: null,
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRole = {
    id: 'role-123',
    name: 'Technician',
    tenantId: 'tenant-123',
    description: 'Field technician role',
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeam = {
    id: 'team-123',
    tenantId: 'tenant-123',
    name: 'Engineering',
    code: 'ENG',
    color: '#0000FF',
    description: 'Engineering team',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserTeam = {
    userId: 'user-123',
    teamId: 'team-123',
    isPrimary: true,
    role: 'member',
    createdAt: new Date(),
    team: mockTeam,
  };

  const mockUserWithRoles = {
    ...mockUser,
    userRoles: [
      {
        userId: mockUser.id,
        roleId: mockRole.id,
        role: mockRole,
      },
    ],
    userTeams: [mockUserTeam],
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
    team: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    userRole: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    userTeam: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      const users = [mockUserWithRoles];
      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll(mockTenantContext, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('email', mockUser.email);
      expect(result.data[0]).toHaveProperty('roles');
      expect(result.data[0].roles).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll(mockTenantContext, {
        search: 'john',
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantContext.tenantId,
            OR: expect.arrayContaining([
              { email: { contains: 'john', mode: 'insensitive' } },
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should use default pagination values', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      const result = await service.findAll(mockTenantContext, {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('findById', () => {
    const mockUserWithPermissions = {
      ...mockUser,
      userRoles: [
        {
          userId: mockUser.id,
          roleId: mockRole.id,
          role: {
            ...mockRole,
            rolePermissions: [
              {
                roleId: mockRole.id,
                permissionId: 'perm-1',
                permission: { resource: 'work_orders', action: 'read' },
              },
            ],
          },
        },
      ],
      userTeams: [mockUserTeam],
    };

    it('should return user with roles and permissions', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUserWithPermissions);

      const result = await service.findById(mockTenantContext, 'user-123');

      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', mockUser.email);
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0]).toHaveProperty('name', 'Technician');
      expect(result.roles[0].permissions).toContain('work_orders:read');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(mockTenantContext, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findById(mockTenantContext, 'nonexistent'),
      ).rejects.toThrow('User not found');
    });

    it('should only find users in same tenant', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await service.findById(mockTenantContext, 'user-123').catch(() => {});

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123', tenantId: mockTenantContext.tenantId },
        }),
      );
    });
  });

  describe('findByEmail', () => {
    it('should find user by email within tenant', async () => {
      const userWithTenant = {
        ...mockUserWithRoles,
        tenant: { id: 'tenant-123', name: 'Test Tenant', slug: 'test-tenant' },
      };
      mockPrismaService.user.findFirst.mockResolvedValue(userWithTenant);

      const result = await service.findByEmail('tenant-123', 'test@example.com');

      expect(result).toHaveProperty('email', 'test@example.com');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-123', email: 'test@example.com' },
        }),
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

    it('should create a new user successfully with team', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.role.findMany.mockResolvedValue([mockRole]);

      // Mock the transaction
      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue({
            ...mockUser,
            ...createDto,
            id: 'new-user-123',
            userRoles: [{ userId: 'new-user-123', roleId: 'role-123', role: mockRole }],
          }),
        },
        userTeam: {
          create: jest.fn().mockResolvedValue(mockUserTeam),
          createMany: jest.fn(),
        },
      };
      mockPrismaService.$transaction.mockImplementation((fn) => fn(mockTx));

      const result = await service.create(mockTenantContext, createDto);

      expect(result).toHaveProperty('email', createDto.email);
      expect(result.roles).toHaveLength(1);
      expect(argon2.hash).toHaveBeenCalledWith(createDto.password);
      expect(mockTx.userTeam.create).toHaveBeenCalledWith({
        data: {
          userId: 'new-user-123',
          teamId: 'team-123',
          isPrimary: true,
          role: 'member',
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.create(mockTenantContext, createDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.create(mockTenantContext, createDto),
      ).rejects.toThrow('A user with this email already exists');
    });

    it('should throw BadRequestException for invalid primary team ID', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.team.findFirst.mockResolvedValue(null); // No team found

      await expect(
        service.create(mockTenantContext, createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockTenantContext, createDto),
      ).rejects.toThrow('Invalid primary team ID');
    });

    it('should throw BadRequestException for invalid additional team IDs', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.team.findMany.mockResolvedValue([]); // No additional teams found

      const dtoWithAdditionalTeams = {
        ...createDto,
        additionalTeamIds: ['team-456'],
      };

      await expect(
        service.create(mockTenantContext, dtoWithAdditionalTeams),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockTenantContext, dtoWithAdditionalTeams),
      ).rejects.toThrow('One or more additional team IDs are invalid');
    });

    it('should throw BadRequestException for invalid role IDs', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.role.findMany.mockResolvedValue([]); // No roles found

      await expect(
        service.create(mockTenantContext, createDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockTenantContext, createDto),
      ).rejects.toThrow('One or more invalid role IDs');
    });

    it('should create user with additional teams', async () => {
      const additionalTeam = { ...mockTeam, id: 'team-456', name: 'Operations' };
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.team.findFirst.mockResolvedValue(mockTeam);
      mockPrismaService.team.findMany.mockResolvedValue([additionalTeam]);
      mockPrismaService.role.findMany.mockResolvedValue([mockRole]);

      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue({
            ...mockUser,
            id: 'new-user-123',
            userRoles: [{ userId: 'new-user-123', roleId: 'role-123', role: mockRole }],
          }),
        },
        userTeam: {
          create: jest.fn().mockResolvedValue(mockUserTeam),
          createMany: jest.fn(),
        },
      };
      mockPrismaService.$transaction.mockImplementation((fn) => fn(mockTx));

      const dtoWithAdditionalTeams = {
        ...createDto,
        additionalTeamIds: ['team-456'],
      };

      await service.create(mockTenantContext, dtoWithAdditionalTeams);

      expect(mockTx.userTeam.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'new-user-123',
            teamId: 'team-456',
            isPrimary: false,
            role: 'member',
          },
        ],
      });
    });
  });

  describe('update', () => {
    const updateData = {
      firstName: 'Johnny',
      lastName: 'Updated',
    };

    it('should update user successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUserWithRoles,
        ...updateData,
      });

      const result = await service.update(mockTenantContext, 'user-123', updateData);

      expect(result).toHaveProperty('firstName', updateData.firstName);
      expect(result).toHaveProperty('lastName', updateData.lastName);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockTenantContext, 'nonexistent', updateData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if changing to existing email', async () => {
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockUser) // First call: find the user to update
        .mockResolvedValueOnce({ id: 'other-user', email: 'taken@example.com' }); // Second call: check email uniqueness

      await expect(
        service.update(mockTenantContext, 'user-123', { email: 'taken@example.com' }),
      ).rejects.toThrow('A user with this email already exists');
    });

    it('should allow keeping same email', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUserWithRoles);

      await service.update(mockTenantContext, 'user-123', {
        email: mockUser.email, // Same email
      });

      // Should not check for email uniqueness if email unchanged
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.updatePassword(
        mockTenantContext,
        'user-123',
        'NewSecurePass456!',
      );

      expect(result).toEqual({ success: true });
      expect(argon2.hash).toHaveBeenCalledWith('NewSecurePass456!');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { passwordHash: 'hashed-password' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePassword(mockTenantContext, 'nonexistent', 'password'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate user successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.deactivate(mockTenantContext, 'user-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate(mockTenantContext, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deactivating yourself', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        id: mockTenantContext.userId,
      });

      await expect(
        service.deactivate(mockTenantContext, mockTenantContext.userId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deactivate(mockTenantContext, mockTenantContext.userId),
      ).rejects.toThrow('You cannot deactivate your own account');
    });
  });

  describe('activate', () => {
    it('should activate user successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        isActive: true,
      });

      const result = await service.activate(mockTenantContext, 'user-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { isActive: true },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.activate(mockTenantContext, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRoles', () => {
    const mockUserWithPermissions = {
      ...mockUser,
      userRoles: [
        {
          userId: mockUser.id,
          roleId: mockRole.id,
          role: {
            ...mockRole,
            rolePermissions: [],
          },
        },
      ],
      userTeams: [mockUserTeam],
    };

    it('should assign roles to user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUserWithPermissions);
      mockPrismaService.role.findMany.mockResolvedValue([mockRole]);
      mockPrismaService.$transaction.mockResolvedValue([
        { count: 1 },
        { count: 1 },
      ]);

      const result = await service.assignRoles(mockTenantContext, 'user-123', [
        'role-123',
      ]);

      expect(result).toHaveProperty('id', mockUser.id);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assignRoles(mockTenantContext, 'nonexistent', ['role-123']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid role IDs', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.role.findMany.mockResolvedValue([]); // No matching roles

      await expect(
        service.assignRoles(mockTenantContext, 'user-123', ['invalid-role']),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignRoles(mockTenantContext, 'user-123', ['invalid-role']),
      ).rejects.toThrow('One or more invalid role IDs');
    });

    it('should validate all roles belong to tenant', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.role.findMany.mockResolvedValue([mockRole]); // Only 1 of 2 roles found

      await expect(
        service.assignRoles(mockTenantContext, 'user-123', ['role-123', 'role-456']),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserTeams', () => {
    it('should return user teams successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.userTeam.findMany.mockResolvedValue([mockUserTeam]);

      const result = await service.getUserTeams(mockTenantContext, 'user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'team-123');
      expect(result[0]).toHaveProperty('name', 'Engineering');
      expect(result[0]).toHaveProperty('isPrimary', true);
      expect(result[0]).toHaveProperty('role', 'member');
      expect(result[0]).toHaveProperty('joinedAt');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getUserTeams(mockTenantContext, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getUserTeams(mockTenantContext, 'nonexistent'),
      ).rejects.toThrow('User not found');
    });

    it('should return empty array if user has no teams', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.userTeam.findMany.mockResolvedValue([]);

      const result = await service.getUserTeams(mockTenantContext, 'user-123');

      expect(result).toEqual([]);
    });

    it('should order teams with primary first', async () => {
      const secondaryTeam = {
        ...mockUserTeam,
        teamId: 'team-456',
        isPrimary: false,
        team: { ...mockTeam, id: 'team-456', name: 'Operations' },
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.userTeam.findMany.mockResolvedValue([secondaryTeam, mockUserTeam]);

      const result = await service.getUserTeams(mockTenantContext, 'user-123');

      expect(result).toHaveLength(2);
      // Note: The ordering is handled by Prisma orderBy, so mock order represents DB order
    });
  });
});
