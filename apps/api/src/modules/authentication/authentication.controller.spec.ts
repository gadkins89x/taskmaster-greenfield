import { Test, TestingModule } from '@nestjs/testing';
import { Response, Request } from 'express';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let authService: AuthenticationService;

  const mockAuthResult = {
    accessToken: 'mock-access-token',
    expiresIn: 900,
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-123',
      tenantName: 'Test Tenant',
      roles: ['Technician'],
      permissions: ['work_orders:read', 'work_orders:update'],
    },
  };

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const mockResponse = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        { provide: AuthenticationService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    authService = module.get<AuthenticationService>(AuthenticationService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
      tenantSlug: 'test-tenant',
    };

    it('should return access token and user info on successful login', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResult);

      const result = await controller.login(loginDto, mockResponse);

      expect(result).toEqual({
        accessToken: mockAuthResult.accessToken,
        expiresIn: mockAuthResult.expiresIn,
        user: mockAuthResult.user,
      });
      expect(authService.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
        loginDto.tenantSlug,
      );
    });

    it('should set refresh token as httpOnly cookie', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResult);

      await controller.login(loginDto, mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockAuthResult.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/api/v1/auth',
        }),
      );
    });

    it('should not include refresh token in response body', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResult);

      const result = await controller.login(loginDto, mockResponse);

      expect(result).not.toHaveProperty('refreshToken');
    });
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

    it('should return access token and user info on successful registration', async () => {
      const registrationResult = {
        ...mockAuthResult,
        user: {
          ...mockAuthResult.user,
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        },
      };
      mockAuthService.register.mockResolvedValue(registrationResult);

      const result = await controller.register(registerDto, mockResponse);

      expect(result).toEqual({
        accessToken: registrationResult.accessToken,
        expiresIn: registrationResult.expiresIn,
        user: registrationResult.user,
      });
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should set refresh token as httpOnly cookie after registration', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthResult);

      await controller.register(registerDto, mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockAuthResult.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/api/v1/auth',
        }),
      );
    });
  });

  describe('refresh', () => {
    const mockRequest = {
      cookies: {
        refreshToken: 'valid-refresh-token',
      },
    } as unknown as Request;

    it('should return new access token on successful refresh', async () => {
      const refreshResult = {
        accessToken: 'new-access-token',
        expiresIn: 900,
      };
      mockAuthService.refresh.mockResolvedValue(refreshResult);

      const result = await controller.refresh(mockRequest);

      expect(result).toEqual(refreshResult);
      expect(authService.refresh).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should throw error if no refresh token in cookies', async () => {
      const requestWithoutToken = {
        cookies: {},
      } as unknown as Request;

      await expect(controller.refresh(requestWithoutToken)).rejects.toThrow(
        'No refresh token provided',
      );
    });

    it('should throw error if cookies are undefined', async () => {
      const requestWithoutCookies = {} as Request;

      await expect(controller.refresh(requestWithoutCookies)).rejects.toThrow(
        'No refresh token provided',
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token and clear cookie', async () => {
      const mockRequest = {
        cookies: {
          refreshToken: 'token-to-revoke',
        },
      } as unknown as Request;
      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(mockRequest, mockResponse);

      expect(authService.logout).toHaveBeenCalledWith('token-to-revoke');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/api/v1/auth',
      });
    });

    it('should clear cookie even if no refresh token exists', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      await controller.logout(mockRequest, mockResponse);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/api/v1/auth',
      });
    });
  });

  describe('me', () => {
    it('should return current user info from request', async () => {
      const mockTenantContext: TenantContext = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        email: 'test@example.com',
        permissions: ['work_orders:read'],
      };

      const mockRequestWithUser = {
        user: mockTenantContext,
      } as unknown as Request & { user: TenantContext };

      const result = await controller.me(mockRequestWithUser);

      expect(result).toEqual(mockTenantContext);
    });
  });
});
