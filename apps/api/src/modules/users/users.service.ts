import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(ctx: TenantContext, filters: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = filters;

    const where = {
      tenantId: ctx.tenantId,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          userRoles: {
            include: { role: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        avatarUrl: u.avatarUrl,
        isActive: u.isActive,
        roles: u.userRoles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
        })),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(ctx: TenantContext, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
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

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        permissions: ur.role.rolePermissions.map(
          (rp) => `${rp.permission.resource}:${rp.permission.action}`,
        ),
      })),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async findByEmail(tenantId: string, email: string) {
    return this.prisma.user.findFirst({
      where: { tenantId, email },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
        tenant: true,
      },
    });
  }

  async create(
    ctx: TenantContext,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      roleIds?: string[];
    },
  ) {
    // Check if email already exists in tenant
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: ctx.tenantId, email: data.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    // Validate roles belong to tenant
    if (data.roleIds?.length) {
      const roles = await this.prisma.role.findMany({
        where: { id: { in: data.roleIds }, tenantId: ctx.tenantId },
      });
      if (roles.length !== data.roleIds.length) {
        throw new BadRequestException('One or more invalid role IDs');
      }
    }

    // Hash password
    const passwordHash = await argon2.hash(data.password);

    const user = await this.prisma.user.create({
      data: {
        tenantId: ctx.tenantId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        userRoles: data.roleIds?.length
          ? {
              create: data.roleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    return this.mapUser(user);
  }

  async update(
    ctx: TenantContext,
    id: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findFirst({
        where: { tenantId: ctx.tenantId, email: data.email, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    return this.mapUser(updated);
  }

  async updatePassword(ctx: TenantContext, id: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { success: true };
  }

  async deactivate(ctx: TenantContext, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deactivating yourself
    if (id === ctx.userId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  async activate(ctx: TenantContext, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    return { success: true };
  }

  async assignRoles(ctx: TenantContext, id: string, roleIds: string[]) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate roles belong to tenant
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds }, tenantId: ctx.tenantId },
    });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more invalid role IDs');
    }

    // Replace all roles
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
      }),
    ]);

    return this.findById(ctx, id);
  }

  private mapUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      roles: user.userRoles?.map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
      })) ?? [],
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
