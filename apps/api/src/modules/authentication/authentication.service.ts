import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: string, password: string, tenantSlug?: string) {
    // For now, find user by email across all tenants (multi-tenant login flow can be enhanced)
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        ...(tenantSlug && { tenant: { slug: tenantSlug } }),
      },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get permissions from roles
    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
    );

    // Generate tokens
    const { accessToken, expiresIn } = await this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      permissions,
    });

    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    return {
      accessToken,
      expiresIn,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        roles: user.userRoles.map((ur) => ur.role.name),
        permissions,
      },
    };
  }

  async refresh(refreshToken: string) {
    const tokenData = await this.tokenService.validateRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: tokenData.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
    );

    const { accessToken, expiresIn } = await this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      permissions,
    });

    return { accessToken, expiresIn };
  }

  async logout(refreshToken: string) {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }
}
