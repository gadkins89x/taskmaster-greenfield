import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { PrismaService } from '../../common/database/prisma.service';
import { RegisterDto } from './dto';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    // Find tenant by slug
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${dto.tenantSlug}' not found`);
    }

    if (!tenant.isActive) {
      throw new BadRequestException('Tenant is not active');
    }

    // Check if email already exists in this tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        tenantId: tenant.id,
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered in this tenant');
    }

    // Hash password
    const passwordHash = await argon2.hash(dto.password);

    // Find the default role (Requester) for this tenant
    const defaultRole = await this.prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'Requester',
      },
    });

    // Create user with transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          tenantId: tenant.id,
          isActive: true,
        },
      });

      // Assign default role if exists
      if (defaultRole) {
        await tx.userRole.create({
          data: {
            userId: newUser.id,
            roleId: defaultRole.id,
            assignedAt: new Date(),
          },
        });
      }

      return newUser;
    });

    // Auto-login: generate tokens
    const permissions = defaultRole
      ? await this.getPermissionsForRole(defaultRole.id)
      : [];

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
        tenantName: tenant.name,
        roles: defaultRole ? [defaultRole.name] : [],
        permissions,
      },
    };
  }

  private async getPermissionsForRole(roleId: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });

    return rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );
  }

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
