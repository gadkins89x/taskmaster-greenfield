import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  async findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
  ) {
    return this.assetsService.findAll(ctx, { page, limit, search, locationId, status });
  }

  @Get('by-tag/:tag')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset by tag (for QR scanning)' })
  async findByTag(@TenantCtx() ctx: TenantContext, @Param('tag') tag: string) {
    return this.assetsService.findByTag(ctx, tag);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset by ID' })
  async findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.assetsService.findById(ctx, id);
  }
}
