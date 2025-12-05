import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { TenantCtx } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'List all assets' })
  @ApiQuery({ name: 'teamId', required: false, description: 'Filter by team (admins only can see all teams)' })
  async findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.assetsService.findAll(ctx, { page, limit, search, locationId, status, teamId });
  }

  @Get('by-tag/:tag')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset by tag (for QR scanning)' })
  async findByTag(@TenantCtx() ctx: TenantContext, @Param('tag') tag: string) {
    return this.assetsService.findByTag(ctx, tag);
  }

  @Get('barcode/:barcode')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset by barcode (asset tag or serial number)' })
  async findByBarcode(@TenantCtx() ctx: TenantContext, @Param('barcode') barcode: string) {
    return this.assetsService.findByBarcode(ctx, barcode);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset by ID' })
  async findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.assetsService.findById(ctx, id);
  }

  @Post()
  @Permissions('assets:create')
  @ApiOperation({ summary: 'Create a new asset' })
  async create(
    @TenantCtx() ctx: TenantContext,
    @Body() body: {
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
      teamId?: string; // Optional team assignment (defaults to user's primary team)
    },
  ) {
    return this.assetsService.create(ctx, body);
  }

  @Patch(':id')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Update an asset' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
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
    return this.assetsService.update(ctx, id, body);
  }

  @Patch(':id/status')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Update asset status' })
  async updateStatus(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.assetsService.updateStatus(ctx, id, body.status);
  }

  @Delete(':id')
  @Permissions('assets:delete')
  @ApiOperation({ summary: 'Delete an asset' })
  async delete(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.assetsService.delete(ctx, id);
  }
}
