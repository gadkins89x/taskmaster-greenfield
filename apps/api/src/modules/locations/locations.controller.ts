import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { TenantCtx } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @Permissions('locations:read')
  @ApiOperation({ summary: 'List all locations' })
  async findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('parentId') parentId?: string,
    @Query('flat') flat?: boolean,
  ) {
    return this.locationsService.findAll(ctx, { parentId, flat });
  }

  @Get(':id')
  @Permissions('locations:read')
  @ApiOperation({ summary: 'Get location by ID' })
  async findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.locationsService.findById(ctx, id);
  }
}
