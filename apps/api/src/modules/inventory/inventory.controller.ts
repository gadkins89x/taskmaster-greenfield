import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  TransactionType,
  IssueInventoryDto,
  ReceiveInventoryDto,
  AdjustInventoryDto,
} from './dto';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @RequirePermissions('inventory:create')
  @ApiOperation({ summary: 'Create a new inventory item' })
  create(@CurrentUser() ctx: TenantContext, @Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.create(ctx, dto);
  }

  @Get()
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'locationId', required: false, type: String })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @CurrentUser() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('locationId') locationId?: string,
    @Query('lowStock') lowStock?: boolean,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.inventoryService.findAll(ctx, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      category,
      locationId,
      lowStock: lowStock === true || lowStock === 'true' as unknown as boolean,
      search,
      isActive: isActive === undefined ? undefined : isActive === true || isActive === 'true' as unknown as boolean,
    });
  }

  @Get('low-stock')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get items with low stock' })
  getLowStock(@CurrentUser() ctx: TenantContext) {
    return this.inventoryService.getLowStockItems(ctx);
  }

  @Get('categories')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get all inventory categories' })
  getCategories(@CurrentUser() ctx: TenantContext) {
    return this.inventoryService.getCategories(ctx);
  }

  @Get('barcode/:barcode')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Find inventory item by barcode' })
  @ApiParam({ name: 'barcode', type: String })
  findByBarcode(@CurrentUser() ctx: TenantContext, @Param('barcode') barcode: string) {
    return this.inventoryService.findByBarcode(ctx, barcode);
  }

  @Get(':id')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@CurrentUser() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findOne(ctx, id);
  }

  @Put(':id')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiParam({ name: 'id', type: String })
  update(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory:delete')
  @ApiOperation({ summary: 'Delete inventory item' })
  @ApiParam({ name: 'id', type: String })
  delete(@CurrentUser() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.delete(ctx, id);
  }

  @Post(':id/issue')
  @RequirePermissions('inventory:issue')
  @ApiOperation({ summary: 'Issue stock from inventory' })
  @ApiParam({ name: 'id', type: String })
  issueStock(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IssueInventoryDto,
  ) {
    return this.inventoryService.issueStock(ctx, id, dto);
  }

  @Post(':id/receive')
  @RequirePermissions('inventory:receive')
  @ApiOperation({ summary: 'Receive stock into inventory' })
  @ApiParam({ name: 'id', type: String })
  receiveStock(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveInventoryDto,
  ) {
    return this.inventoryService.receiveStock(ctx, id, dto);
  }

  @Post(':id/adjust')
  @RequirePermissions('inventory:adjust')
  @ApiOperation({ summary: 'Adjust inventory stock count' })
  @ApiParam({ name: 'id', type: String })
  adjustStock(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjustStock(ctx, id, dto);
  }

  @Get(':id/transactions')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get transaction history for an item' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  getTransactions(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: TransactionType,
  ) {
    return this.inventoryService.getTransactionHistory(ctx, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type,
    });
  }
}
