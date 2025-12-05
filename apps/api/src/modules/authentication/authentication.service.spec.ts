import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthenticationService } from './authentication.service';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { PrismaService } from '../../common/database/prisma.service';

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  verify: jest.fn(),
}));

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let prismaService: PrismaService;
  let tokenService: TokenService;

  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    isActive: true,
    settings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    phone: null,
    avatarUrl: null,
    isActive: true,
    tenantId: 'tenant-123',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRole = {
    id: 'role-123',
    name: 'Requester',
    tenantId: 'tenant-123',
    description: 'Default role',
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

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      expiresIn: 900,
    }),
    generateRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    prismaService = module.get<PrismaService>(PrismaService);
    tokenService = module.get<TokenService>(TokenService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '555-1234',
      tenantSlug: 'test-tenant',
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        { permission: mockPermission },
      ]);

      const newUser = {
        ...mockUser,
        id: 'new-user-123',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          user: {
            create: jest.fn().mockResolvedValue(newUser),
          },
          userRole: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
      expect(result).toHaveProperty('expiresIn', 900);
      expect(result.user).toHaveProperty('email', registerDto.email);
      expect(result.user).toHaveProperty('firstName', registerDto.firstName);
      expect(result.user).toHaveProperty('tenantId', mockTenant.id);
      expect(argon2.hash).toHaveBeenCalledWith(registerDto.password);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        "Tenant with slug 'test-tenant' not found",
      );
    });

    it('should throw BadRequestException if tenant is inactive', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        ...mockTenant,
        isActive: false,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Tenant is not active',
      );
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already registered in this tenant',
      );
    });

    it('should register user without default role if none exists', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      const newUser = {
        ...mockUser,
        id: 'new-user-123',
        email: registerDto.email,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          user: {
            create: jest.fn().mockResolvedValue(newUser),
          },
          userRole: {
            create: jest.fn(),
          },
        };
        return callback(mockTx);
      });

      const result = await service.register(registerDto);

      expect(result.user.roles).toEqual([]);
      expect(result.user.permissions).toEqual([]);
    });
  });

  describe('login', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'password123',
      tenantSlug: 'test-tenant',
    };

    const userWithRoles = {
      ...mockUser,
      tenant: mockTenant,
      userRoles: [
        {
          role: {
            name: 'Technician',
            rolePermissions: [
              { permission: { resource: 'work_orders', action: 'read' } },
              { permission: { resource: 'work_orders', action: 'update' } },
            ],
          },
        },
      ],
      userTeams: [
        {
          teamId: 'team-123',
          isPrimary: true,
          role: 'member',
          team: {
            id: 'team-123',
            name: 'Maintenance',
            code: 'MAINT',
            color: '#3B82F6',
          },
        },
      ],
    };

    it('should login successfully with valid credentials', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(userWithRoles);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.login(
        loginCredentials.email,
        loginCredentials.password,
        loginCredentials.tenantSlug,
      );

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
      expect(result.user).toHaveProperty('email', mockUser.email);
      expect(result.user.roles).toContain('Technician');
      expect(result.user.permissions).toContain('work_orders:read');
      expect(result.user.permissions).toContain('work_orders:update');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login(
          loginCredentials.email,
          loginCredentials.password,
          loginCredentials.tenantSlug,
        ),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login(
          loginCredentials.email,
          loginCredentials.password,
          loginCredentials.tenantSlug,
        ),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(userWithRoles);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(
          loginCredentials.email,
          loginCredentials.password,
          loginCredentials.tenantSlug,
        ),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login(
          loginCredentials.email,
          loginCredentials.password,
          loginCredentials.tenantSlug,
        ),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should login without tenantSlug (cross-tenant lookup)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(userWithRoles);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.login(
        loginCredentials.email,
        loginCredentials.password,
      );

      expect(result).toHaveProperty('accessToken');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: loginCredentials.email,
            isActive: true,
          },
        }),
      );
    });

    it('should generate tokens with correct payload', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(userWithRoles);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.login(
        loginCredentials.email,
        loginCredentials.password,
        loginCredentials.tenantSlug,
      );

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        permissions: ['work_orders:read', 'work_orders:update'],
        teamIds: ['team-123'],
        primaryTeamId: 'team-123',
        isAdmin: false,
      });
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('refresh', () => {
    const userWithRoles = {
      ...mockUser,
      isActive: true,
      userRoles: [
        {
          role: {
            name: 'Admin',
            rolePermissions: [
              { permission: { resource: 'users', action: 'manage' } },
            ],
          },
        },
      ],
      userTeams: [
        {
          teamId: 'team-123',
          isPrimary: true,
          role: 'admin',
        },
      ],
    };

    it('should refresh tokens successfully', async () => {
      mockTokenService.validateRefreshToken.mockResolvedValue({
        userId: 'user-123',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(userWithRoles);

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('expiresIn', 900);
      expect(tokenService.validateRefreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockTokenService.validateRefreshToken.mockResolvedValue({
        userId: 'user-123',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh('valid-refresh-token')).rejects.toThrow(
        'User not found or inactive',
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockTokenService.validateRefreshToken.mockResolvedValue({
        userId: 'user-123',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...userWithRoles,
        isActive: false,
      });

      await expect(service.refresh('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh('valid-refresh-token')).rejects.toThrow(
        'User not found or inactive',
      );
    });

    it('should include correct permissions in refreshed token', async () => {
      mockTokenService.validateRefreshToken.mockResolvedValue({
        userId: 'user-123',
      });
      mockPrismaService.user.findUnique.mockResolvedValue(userWithRoles);

      await service.refresh('valid-refresh-token');

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        tenantId: mockUser.tenantId,
        permissions: ['users:manage'],
        teamIds: ['team-123'],
        primaryTeamId: 'team-123',
        isAdmin: true,
      });
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      mockTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      await service.logout('refresh-token-to-revoke');

      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith(
        'refresh-token-to-revoke',
      );
    });
  });
});
