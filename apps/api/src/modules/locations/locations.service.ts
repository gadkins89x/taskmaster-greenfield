import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private buildTree(locations: any[]) {
    const map = new Map();
    const roots: any[] = [];

    locations.forEach((loc) => {
      map.set(loc.id, { ...this.mapLocation(loc), children: [] });
    });

    locations.forEach((loc) => {
      const node = map.get(loc.id);
      if (loc.parentId && map.has(loc.parentId)) {
        map.get(loc.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  private mapLocation(location: any) {
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
