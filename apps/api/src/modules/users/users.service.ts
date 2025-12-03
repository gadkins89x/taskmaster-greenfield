import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

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
}
