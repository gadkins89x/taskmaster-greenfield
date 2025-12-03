import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(ctx: TenantContext) {
    const roles = await this.prisma.role.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => this.mapRole(r));
  }

  async findById(ctx: TenantContext, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.mapRole(role);
  }

  async findAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    return permissions.map((p) => ({
      id: p.id,
      resource: p.resource,
      action: p.action,
      description: p.description,
    }));
  }

  async create(
    ctx: TenantContext,
    data: {
      name: string;
      description?: string;
      permissionIds?: string[];
    },
  ) {
    // Check if role name already exists in tenant
    const existing = await this.prisma.role.findFirst({
      where: { tenantId: ctx.tenantId, name: data.name },
    });

    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }

    // Validate permissions exist
    if (data.permissionIds?.length) {
      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: data.permissionIds } },
      });
      if (permissions.length !== data.permissionIds.length) {
        throw new BadRequestException('One or more invalid permission IDs');
      }
    }

    const role = await this.prisma.role.create({
      data: {
        tenantId: ctx.tenantId,
        name: data.name,
        description: data.description,
        isSystem: false,
        rolePermissions: data.permissionIds?.length
          ? {
              create: data.permissionIds.map((permissionId) => ({ permissionId })),
            }
          : undefined,
      },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });

    return this.mapRole(role);
  }

  async update(
    ctx: TenantContext,
    id: string,
    data: {
      name?: string;
      description?: string;
    },
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    // Check name uniqueness if changing
    if (data.name && data.name !== role.name) {
      const existing = await this.prisma.role.findFirst({
        where: { tenantId: ctx.tenantId, name: data.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('A role with this name already exists');
      }
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });

    return this.mapRole(updated);
  }

  async delete(ctx: TenantContext, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { _count: { select: { userRoles: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestException(
        `Cannot delete role that is assigned to ${role._count.userRoles} user(s)`,
      );
    }

    await this.prisma.role.delete({ where: { id } });

    return { success: true };
  }

  async assignPermissions(ctx: TenantContext, id: string, permissionIds: string[]) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('System role permissions cannot be modified');
    }

    // Validate permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more invalid permission IDs');
    }

    // Replace all permissions
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      }),
    ]);

    return this.findById(ctx, id);
  }

  private mapRole(role: any) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.userRoles,
      permissions: role.rolePermissions.map(
        (rp: any) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
      permissionIds: role.rolePermissions.map((rp: any) => rp.permission.id),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}
