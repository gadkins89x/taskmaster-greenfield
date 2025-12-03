import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(ctx: TenantContext, filters: {
    page?: number;
    limit?: number;
    search?: string;
    locationId?: string;
    status?: string;
  }) {
    const { page = 1, limit = 20, search, locationId, status } = filters;

    const where = {
      tenantId: ctx.tenantId,
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
        purchaseDate: a.purchaseDate?.toISOString().split('T')[0] ?? null,
        warrantyExpires: a.warrantyExpires?.toISOString().split('T')[0] ?? null,
        openWorkOrdersCount: a._count.workOrders,
        createdAt: a.createdAt.toISOString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(ctx: TenantContext, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        location: true,
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
    const asset = await this.prisma.asset.findFirst({
      where: { tenantId: ctx.tenantId, assetTag },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return this.findById(ctx, asset.id);
  }
}
