import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { PrismaService } from '../../common/database/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let _prismaService: PrismaService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    _prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate an access token with correct payload', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        tenantId: 'tenant-456',
        permissions: ['work_orders:read', 'work_orders:create'],
      };

      const result = await service.generateAccessToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: payload.userId,
        email: payload.email,
        tenantId: payload.tenantId,
        permissions: payload.permissions,
      });
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.expiresIn).toBe(900); // 15m = 900 seconds
    });
  });

  describe('generateRefreshToken', () => {
    it('should create a refresh token in database', async () => {
      mockPrismaService.refreshToken.create.mockResolvedValue({ id: 'token-id' });

      const result = await service.generateRefreshToken('user-123', 'Chrome/Windows');

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          tokenHash: expect.any(String),
          deviceInfo: 'Chrome/Windows',
          expiresAt: expect.any(Date),
        }),
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBe(36); // UUID length
    });
  });

  describe('validateRefreshToken', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.validateRefreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const expiredToken = {
        id: 'token-id',
        userId: 'user-123',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(expiredToken);
      mockPrismaService.refreshToken.delete.mockResolvedValue(expiredToken);

      await expect(service.validateRefreshToken('expired-token')).rejects.toThrow(
        'Refresh token expired',
      );
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalled();
    });

    it('should return userId for valid token', async () => {
      const validToken = {
        id: 'token-id',
        userId: 'user-123',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000000), // Future expiry
      };
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(validToken);

      const result = await service.validateRefreshToken('valid-token');

      expect(result.userId).toBe('user-123');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should delete refresh token from database', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.revokeRefreshToken('some-token');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should delete all tokens for a user', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      await service.revokeAllUserTokens('user-123');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });

  describe('parseExpiresIn (via generateAccessToken)', () => {
    // Testing the private method through its effects on generateAccessToken
    it.each([
      ['30s', 30],
      ['15m', 900],
      ['1h', 3600],
      ['7d', 604800],
      ['invalid', 900], // defaults to 15 minutes
    ])('should parse "%s" to %d seconds', async (input, expected) => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return input;
        return '7d';
      });

      const result = await service.generateAccessToken({
        userId: 'user',
        email: 'test@test.com',
        tenantId: 'tenant',
        permissions: [],
      });

      expect(result.expiresIn).toBe(expected);
    });
  });
});
