import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

interface LocationNode {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  metadata: Prisma.JsonValue;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children: LocationNode[];
}

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ctx: TenantContext,
    data: {
      name: string;
      code: string;
      type: string;
      parentId?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      metadata?: Record<string, unknown>;
    },
  ) {
    // Validate type
    const validTypes = ['site', 'building', 'floor', 'area', 'room'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException(`Type must be one of: ${validTypes.join(', ')}`);
    }

    // Check for duplicate code
    const existing = await this.prisma.location.findFirst({
      where: { tenantId: ctx.tenantId, code: data.code },
    });

    if (existing) {
      throw new ConflictException('A location with this code already exists');
    }

    // Validate parent exists and belongs to tenant
    if (data.parentId) {
      const parent = await this.prisma.location.findFirst({
        where: { id: data.parentId, tenantId: ctx.tenantId },
      });
      if (!parent) {
        throw new BadRequestException('Invalid parent location ID');
      }
    }

    const location = await this.prisma.location.create({
      data: {
        tenantId: ctx.tenantId,
        name: data.name,
        code: data.code,
        type: data.type,
        parentId: data.parentId,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return this.mapLocation(location);
  }

  async update(
    ctx: TenantContext,
    id: string,
    data: {
      name?: string;
      code?: string;
      type?: string;
      parentId?: string | null;
      address?: string;
      latitude?: number;
      longitude?: number;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) {
    const location = await this.prisma.location.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Validate type
    if (data.type) {
      const validTypes = ['site', 'building', 'floor', 'area', 'room'];
      if (!validTypes.includes(data.type)) {
        throw new BadRequestException(`Type must be one of: ${validTypes.join(', ')}`);
      }
    }

    // Check for duplicate code if changing
    if (data.code && data.code !== location.code) {
      const existing = await this.prisma.location.findFirst({
        where: { tenantId: ctx.tenantId, code: data.code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('A location with this code already exists');
      }
    }

    // Validate parent
    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === id) {
        throw new BadRequestException('Location cannot be its own parent');
      }
      const parent = await this.prisma.location.findFirst({
        where: { id: data.parentId, tenantId: ctx.tenantId },
      });
      if (!parent) {
        throw new BadRequestException('Invalid parent location ID');
      }
      // Check for circular reference
      const wouldCreateCycle = await this.wouldCreateCycle(id, data.parentId);
      if (wouldCreateCycle) {
        throw new BadRequestException('This parent would create a circular reference');
      }
    }

    const updated = await this.prisma.location.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        type: data.type,
        parentId: data.parentId,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        isActive: data.isActive,
      },
    });

    return this.mapLocation(updated);
  }

  async delete(ctx: TenantContext, id: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        _count: { select: { children: true, assets: true, workOrders: true } },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    if (location._count.children > 0) {
      throw new BadRequestException(
        `Cannot delete location with ${location._count.children} child location(s). Remove or reassign children first.`,
      );
    }

    if (location._count.assets > 0) {
      throw new BadRequestException(
        `Cannot delete location with ${location._count.assets} asset(s). Remove or reassign assets first.`,
      );
    }

    if (location._count.workOrders > 0) {
      throw new BadRequestException(
        `Cannot delete location with ${location._count.workOrders} work order(s). Consider deactivating it instead.`,
      );
    }

    await this.prisma.location.delete({ where: { id } });

    return { success: true };
  }

  private async wouldCreateCycle(locationId: string, newParentId: string): Promise<boolean> {
    // Check if newParentId is a descendant of locationId
    let current = await this.prisma.location.findUnique({
      where: { id: newParentId },
      select: { parentId: true },
    });

    while (current?.parentId) {
      if (current.parentId === locationId) {
        return true;
      }
      current = await this.prisma.location.findUnique({
        where: { id: current.parentId },
        select: { parentId: true },
      });
    }

    return false;
  }

  async findAll(ctx: TenantContext, filters: { parentId?: string | null; flat?: boolean }) {
    const { flat = false } = filters;

    const locations = await this.prisma.location.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(filters.parentId !== undefined && { parentId: filters.parentId }),
      },
      orderBy: { name: 'asc' },
    });

    if (flat) {
      return locations.map((l) => this.mapLocation(l));
    }

    // Build tree structure
    return this.buildTree(locations);
  }

  async findById(ctx: TenantContext, id: string) {
    const location = await this.prisma.location.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        parent: true,
        _count: { select: { children: true, assets: true } },
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Get ancestors
    const ancestors = await this.getAncestors(location.id);

    return {
      ...this.mapLocation(location),
      ancestors,
      childrenCount: location._count.children,
      assetsCount: location._count.assets,
    };
  }

  private async getAncestors(locationId: string) {
    const ancestors: Array<{ id: string; name: string; code: string; type: string }> = [];
    let current = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { parentId: true },
    });

    while (current?.parentId) {
      const parent = await this.prisma.location.findUnique({
        where: { id: current.parentId },
        select: { id: true, name: true, code: true, type: true, parentId: true },
      });
      if (parent) {
        ancestors.unshift({ id: parent.id, name: parent.name, code: parent.code, type: parent.type });
        current = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  private buildTree(locations: Prisma.LocationGetPayload<Record<string, never>>[]): LocationNode[] {
    const map = new Map<string, LocationNode>();
    const roots: LocationNode[] = [];

    locations.forEach((loc) => {
      map.set(loc.id, { ...this.mapLocation(loc), children: [] });
    });

    locations.forEach((loc) => {
      const node = map.get(loc.id);
      if (!node) return;

      if (loc.parentId && map.has(loc.parentId)) {
        const parent = map.get(loc.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  private mapLocation(location: Prisma.LocationGetPayload<Record<string, never>>) {
    return {
      id: location.id,
      name: location.name,
      code: location.code,
      type: location.type,
      parentId: location.parentId,
      address: location.address,
      latitude: location.latitude ? Number(location.latitude) : null,
      longitude: location.longitude ? Number(location.longitude) : null,
      metadata: location.metadata,
      isActive: location.isActive,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }
}
