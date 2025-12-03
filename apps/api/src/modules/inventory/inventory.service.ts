import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import { AuditService } from '../audit/audit.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  TransactionType,
  IssueInventoryDto,
  ReceiveInventoryDto,
  AdjustInventoryDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async generateItemNumber(tenantId: string): Promise<string> {
    const lastItem = await this.prisma.inventoryItem.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { itemNumber: true },
    });

    let nextNumber = 1;
    if (lastItem?.itemNumber) {
      const match = lastItem.itemNumber.match(/INV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `INV-${nextNumber.toString().padStart(6, '0')}`;
  }

  async create(ctx: TenantContext, dto: CreateInventoryItemDto) {
    const itemNumber = await this.generateItemNumber(ctx.tenantId);

    const item = await this.prisma.inventoryItem.create({
      data: {
        tenantId: ctx.tenantId,
        itemNumber,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        unit: dto.unit || 'each',
        currentStock: dto.currentStock || 0,
        minimumStock: dto.minimumStock || 0,
        reorderPoint: dto.reorderPoint || 0,
        reorderQuantity: dto.reorderQuantity || 0,
        unitCost: dto.unitCost,
        manufacturer: dto.manufacturer,
        partNumber: dto.partNumber,
        barcode: dto.barcode,
        locationId: dto.locationId,
        isActive: dto.isActive ?? true,
      },
      include: {
        location: true,
      },
    });

    await this.auditService.log(ctx, 'InventoryItem', item.id, 'create', null, item);

    return item;
  }

  async findAll(
    ctx: TenantContext,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      locationId?: string;
      lowStock?: boolean;
      search?: string;
      isActive?: boolean;
    } = {},
  ) {
    const { page = 1, limit = 20, category, locationId, lowStock, search, isActive } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
    };

    if (category) {
      where.category = category;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (lowStock) {
      where.currentStock = {
        lte: this.prisma.inventoryItem.fields.reorderPoint,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { itemNumber: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          location: true,
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(ctx: TenantContext, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        location: true,
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            performedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return item;
  }

  async findByBarcode(ctx: TenantContext, barcode: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { barcode, tenantId: ctx.tenantId },
      include: {
        location: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found for barcode');
    }

    return item;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateInventoryItemDto) {
    const existing = await this.findOne(ctx, id);

    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        unit: dto.unit,
        minimumStock: dto.minimumStock,
        reorderPoint: dto.reorderPoint,
        reorderQuantity: dto.reorderQuantity,
        unitCost: dto.unitCost,
        manufacturer: dto.manufacturer,
        partNumber: dto.partNumber,
        barcode: dto.barcode,
        locationId: dto.locationId,
        isActive: dto.isActive,
      },
      include: {
        location: true,
      },
    });

    await this.auditService.log(ctx, 'InventoryItem', id, 'update', existing, item);

    return item;
  }

  async delete(ctx: TenantContext, id: string) {
    const existing = await this.findOne(ctx, id);

    // Check for existing transactions
    const transactionCount = await this.prisma.inventoryTransaction.count({
      where: { itemId: id },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        'Cannot delete item with transaction history. Deactivate instead.',
      );
    }

    await this.prisma.inventoryItem.delete({ where: { id } });

    await this.auditService.log(ctx, 'InventoryItem', id, 'delete', existing, null);

    return { success: true };
  }

  async issueStock(ctx: TenantContext, id: string, dto: IssueInventoryDto) {
    const item = await this.findOne(ctx, id);

    if (item.currentStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.currentStock}, Requested: ${dto.quantity}`,
      );
    }

    const previousStock = item.currentStock;
    const newStock = previousStock - dto.quantity;

    const [updatedItem, transaction] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id },
        data: { currentStock: newStock },
        include: { location: true },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          tenantId: ctx.tenantId,
          itemId: id,
          type: TransactionType.ISSUE,
          quantity: -dto.quantity,
          previousStock,
          newStock,
          unitCost: item.unitCost,
          reference: dto.reference,
          referenceId: dto.referenceId,
          notes: dto.notes,
          performedById: ctx.userId,
        },
        include: {
          performedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    await this.auditService.log(ctx, 'InventoryItem', id, 'issue', item, updatedItem);

    return { item: updatedItem, transaction };
  }

  async receiveStock(ctx: TenantContext, id: string, dto: ReceiveInventoryDto) {
    const item = await this.findOne(ctx, id);

    const previousStock = item.currentStock;
    const newStock = previousStock + dto.quantity;

    const [updatedItem, transaction] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id },
        data: {
          currentStock: newStock,
          unitCost: dto.unitCost ?? item.unitCost,
        },
        include: { location: true },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          tenantId: ctx.tenantId,
          itemId: id,
          type: TransactionType.RECEIPT,
          quantity: dto.quantity,
          previousStock,
          newStock,
          unitCost: dto.unitCost ?? item.unitCost,
          reference: dto.reference,
          notes: dto.notes,
          performedById: ctx.userId,
        },
        include: {
          performedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    await this.auditService.log(ctx, 'InventoryItem', id, 'receive', item, updatedItem);

    return { item: updatedItem, transaction };
  }

  async adjustStock(ctx: TenantContext, id: string, dto: AdjustInventoryDto) {
    const item = await this.findOne(ctx, id);

    const previousStock = item.currentStock;
    const quantityChange = dto.newQuantity - previousStock;

    const [updatedItem, transaction] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id },
        data: { currentStock: dto.newQuantity },
        include: { location: true },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          tenantId: ctx.tenantId,
          itemId: id,
          type: TransactionType.ADJUSTMENT,
          quantity: quantityChange,
          previousStock,
          newStock: dto.newQuantity,
          unitCost: item.unitCost,
          notes: dto.reason,
          performedById: ctx.userId,
        },
        include: {
          performedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    await this.auditService.log(ctx, 'InventoryItem', id, 'adjust', item, updatedItem);

    return { item: updatedItem, transaction };
  }

  async getTransactionHistory(
    ctx: TenantContext,
    itemId: string,
    options: { page?: number; limit?: number; type?: TransactionType } = {},
  ) {
    const { page = 1, limit = 20, type } = options;
    const skip = (page - 1) * limit;

    // Verify item belongs to tenant
    await this.findOne(ctx, itemId);

    const where: Record<string, unknown> = {
      itemId,
      tenantId: ctx.tenantId,
    };

    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          performedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLowStockItems(ctx: TenantContext) {
    const items = await this.prisma.$queryRaw`
      SELECT * FROM inventory_items
      WHERE tenant_id = ${ctx.tenantId}::uuid
        AND is_active = true
        AND current_stock <= reorder_point
      ORDER BY (current_stock::float / NULLIF(reorder_point, 0)) ASC
    `;

    return items;
  }

  async getCategories(ctx: TenantContext) {
    const categories = await this.prisma.inventoryItem.findMany({
      where: { tenantId: ctx.tenantId, category: { not: null } },
      distinct: ['category'],
      select: { category: true },
    });

    return categories.map((c) => c.category).filter(Boolean);
  }
}
