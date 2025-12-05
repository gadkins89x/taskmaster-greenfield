import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import { buildTeamFilter, canAssignToTeam } from '../../common/auth/helpers';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ctx: TenantContext,
    data: {
      name: string;
      assetTag: string;
      serialNumber?: string;
      manufacturer?: string;
      model?: string;
      category?: string;
      status?: string;
      locationId?: string;
      parentAssetId?: string;
      purchaseDate?: string;
      warrantyExpires?: string;
      specifications?: Record<string, unknown>;
      teamId?: string; // Optional team assignment
    },
  ) {
    // Validate team assignment if provided
    if (data.teamId !== undefined && !canAssignToTeam(ctx, data.teamId)) {
      throw new ForbiddenException('You cannot assign assets to this team');
    }

    // Check for duplicate asset tag
    const existing = await this.prisma.asset.findFirst({
      where: { tenantId: ctx.tenantId, assetTag: data.assetTag },
    });

    if (existing) {
      throw new ConflictException('An asset with this tag already exists');
    }

    // Validate location belongs to tenant
    if (data.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: data.locationId, tenantId: ctx.tenantId },
      });
      if (!location) {
        throw new BadRequestException('Invalid location ID');
      }
    }

    // Validate parent asset belongs to tenant
    if (data.parentAssetId) {
      const parent = await this.prisma.asset.findFirst({
        where: { id: data.parentAssetId, tenantId: ctx.tenantId },
      });
      if (!parent) {
        throw new BadRequestException('Invalid parent asset ID');
      }
    }

    // Use user's primary team as default if not specified
    const teamId = data.teamId ?? ctx.primaryTeamId;

    const asset = await this.prisma.asset.create({
      data: {
        tenantId: ctx.tenantId,
        name: data.name,
        assetTag: data.assetTag,
        serialNumber: data.serialNumber,
        manufacturer: data.manufacturer,
        model: data.model,
        category: data.category,
        status: data.status || 'operational',
        locationId: data.locationId,
        teamId,
        parentAssetId: data.parentAssetId,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpires: data.warrantyExpires ? new Date(data.warrantyExpires) : null,
        specifications: data.specifications as Prisma.InputJsonValue | undefined,
      },
      include: {
        location: true,
        team: { select: { id: true, name: true, code: true, color: true } },
      },
    });

    return this.mapAsset(asset);
  }

  async update(
    ctx: TenantContext,
    id: string,
    data: {
      name?: string;
      assetTag?: string;
      serialNumber?: string;
      manufacturer?: string;
      model?: string;
      category?: string;
      locationId?: string;
      parentAssetId?: string;
      purchaseDate?: string;
      warrantyExpires?: string;
      specifications?: Record<string, unknown>;
      teamId?: string; // Optional team reassignment
    },
  ) {
    // Validate team assignment if provided
    if (data.teamId !== undefined && !canAssignToTeam(ctx, data.teamId)) {
      throw new ForbiddenException('You cannot assign assets to this team');
    }

    // Build team filter to ensure user can access the asset
    const teamFilter = buildTeamFilter(ctx);

    const asset = await this.prisma.asset.findFirst({
      where: { id, tenantId: ctx.tenantId, ...teamFilter },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Check for duplicate asset tag if changing
    if (data.assetTag && data.assetTag !== asset.assetTag) {
      const existing = await this.prisma.asset.findFirst({
        where: { tenantId: ctx.tenantId, assetTag: data.assetTag, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('An asset with this tag already exists');
      }
    }

    // Validate location
    if (data.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: data.locationId, tenantId: ctx.tenantId },
      });
      if (!location) {
        throw new BadRequestException('Invalid location ID');
      }
    }

    // Validate parent asset
    if (data.parentAssetId) {
      if (data.parentAssetId === id) {
        throw new BadRequestException('Asset cannot be its own parent');
      }
      const parent = await this.prisma.asset.findFirst({
        where: { id: data.parentAssetId, tenantId: ctx.tenantId },
      });
      if (!parent) {
        throw new BadRequestException('Invalid parent asset ID');
      }
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        name: data.name,
        assetTag: data.assetTag,
        serialNumber: data.serialNumber,
        manufacturer: data.manufacturer,
        model: data.model,
        category: data.category,
        locationId: data.locationId,
        teamId: data.teamId,
        parentAssetId: data.parentAssetId,
        purchaseDate: data.purchaseDate !== undefined
          ? (data.purchaseDate ? new Date(data.purchaseDate) : null)
          : undefined,
        warrantyExpires: data.warrantyExpires !== undefined
          ? (data.warrantyExpires ? new Date(data.warrantyExpires) : null)
          : undefined,
        specifications: data.specifications as Prisma.InputJsonValue | undefined,
      },
      include: {
        location: true,
        team: { select: { id: true, name: true, code: true, color: true } },
      },
    });

    return this.mapAsset(updated);
  }

  async updateStatus(
    ctx: TenantContext,
    id: string,
    status: string,
  ) {
    const validStatuses = ['operational', 'maintenance', 'offline', 'retired'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Build team filter to ensure user can access the asset
    const teamFilter = buildTeamFilter(ctx);

    const asset = await this.prisma.asset.findFirst({
      where: { id, tenantId: ctx.tenantId, ...teamFilter },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: { status },
      include: {
        location: true,
        team: { select: { id: true, name: true, code: true, color: true } },
      },
    });

    return this.mapAsset(updated);
  }

  async delete(ctx: TenantContext, id: string) {
    // Build team filter to ensure user can access the asset
    const teamFilter = buildTeamFilter(ctx);

    const asset = await this.prisma.asset.findFirst({
      where: { id, tenantId: ctx.tenantId, ...teamFilter },
      include: {
        _count: { select: { workOrders: true, childAssets: true } },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset._count.workOrders > 0) {
      throw new BadRequestException(
        `Cannot delete asset with ${asset._count.workOrders} work order(s). Consider retiring it instead.`,
      );
    }

    if (asset._count.childAssets > 0) {
      throw new BadRequestException(
        `Cannot delete asset with ${asset._count.childAssets} child asset(s). Remove or reassign child assets first.`,
      );
    }

    await this.prisma.asset.delete({ where: { id } });

    return { success: true };
  }

  private mapAsset(asset: Prisma.AssetGetPayload<{ include: { location: true; team: { select: { id: true; name: true; code: true; color: true } } } }>) {
    return {
      id: asset.id,
      name: asset.name,
      assetTag: asset.assetTag,
      serialNumber: asset.serialNumber,
      manufacturer: asset.manufacturer,
      model: asset.model,
      category: asset.category,
      status: asset.status,
      location: asset.location ? {
        id: asset.location.id,
        name: asset.location.name,
        code: asset.location.code,
      } : null,
      team: asset.team ?? null,
      parentAssetId: asset.parentAssetId,
      purchaseDate: asset.purchaseDate?.toISOString().split('T')[0] ?? null,
      warrantyExpires: asset.warrantyExpires?.toISOString().split('T')[0] ?? null,
      specifications: asset.specifications,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  async findAll(ctx: TenantContext, filters: {
    page?: number;
    limit?: number;
    search?: string;
    locationId?: string;
    status?: string;
    teamId?: string; // Optional team filter (admins can filter by specific team)
  }) {
    const { page = 1, limit = 20, search, locationId, status, teamId } = filters;

    // Build team filter based on user's role and team memberships
    const teamFilter = buildTeamFilter(ctx, teamId);

    const where = {
      tenantId: ctx.tenantId,
      ...teamFilter,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { assetTag: { contains: search, mode: 'insensitive' as const } },
          { serialNumber: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(locationId && { locationId }),
      ...(status && { status }),
    };

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        include: {
          location: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true, code: true, color: true } },
          _count: { select: { workOrders: { where: { status: { in: ['open', 'in_progress'] } } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      data: assets.map((a) => ({
        id: a.id,
        name: a.name,
        assetTag: a.assetTag,
        serialNumber: a.serialNumber,
        manufacturer: a.manufacturer,
        model: a.model,
        category: a.category,
        status: a.status,
        location: a.location,
        team: a.team,
        purchaseDate: a.purchaseDate?.toISOString().split('T')[0] ?? null,
        warrantyExpires: a.warrantyExpires?.toISOString().split('T')[0] ?? null,
        openWorkOrdersCount: a._count.workOrders,
        createdAt: a.createdAt.toISOString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(ctx: TenantContext, id: string) {
    // Build team filter (user can only see assets from their teams or shared)
    const teamFilter = buildTeamFilter(ctx);

    const asset = await this.prisma.asset.findFirst({
      where: { id, tenantId: ctx.tenantId, ...teamFilter },
      include: {
        location: true,
        team: { select: { id: true, name: true, code: true, color: true } },
        _count: {
          select: {
            workOrders: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const openCount = await this.prisma.workOrder.count({
      where: { assetId: id, status: { in: ['open', 'in_progress'] } },
    });

    return {
      id: asset.id,
      name: asset.name,
      assetTag: asset.assetTag,
      serialNumber: asset.serialNumber,
      manufacturer: asset.manufacturer,
      model: asset.model,
      category: asset.category,
      status: asset.status,
      location: asset.location ? {
        id: asset.location.id,
        name: asset.location.name,
        code: asset.location.code,
        type: asset.location.type,
      } : null,
      team: asset.team ?? null,
      purchaseDate: asset.purchaseDate?.toISOString().split('T')[0] ?? null,
      warrantyExpires: asset.warrantyExpires?.toISOString().split('T')[0] ?? null,
      specifications: asset.specifications,
      workOrderStats: {
        total: asset._count.workOrders,
        open: openCount,
      },
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  async findByTag(ctx: TenantContext, assetTag: string) {
    // Build team filter (user can only see assets from their teams or shared)
    const teamFilter = buildTeamFilter(ctx);

    const asset = await this.prisma.asset.findFirst({
      where: { tenantId: ctx.tenantId, assetTag, ...teamFilter },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return this.findById(ctx, asset.id);
  }

  async findByBarcode(ctx: TenantContext, barcode: string) {
    // Build team filter (user can only see assets from their teams or shared)
    const teamFilter = buildTeamFilter(ctx);

    // Search by asset tag or serial number
    const asset = await this.prisma.asset.findFirst({
      where: {
        tenantId: ctx.tenantId,
        ...teamFilter,
        OR: [
          { assetTag: barcode },
          { serialNumber: barcode },
        ],
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found for barcode');
    }

    return this.findById(ctx, asset.id);
  }
}
