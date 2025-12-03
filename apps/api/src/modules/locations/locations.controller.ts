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

  @Post()
  @Permissions('locations:create')
  @ApiOperation({ summary: 'Create a new location' })
  async create(
    @TenantCtx() ctx: TenantContext,
    @Body() body: {
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
    return this.locationsService.create(ctx, body);
  }

  @Patch(':id')
  @Permissions('locations:update')
  @ApiOperation({ summary: 'Update a location' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
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
    return this.locationsService.update(ctx, id, body);
  }

  @Delete(':id')
  @Permissions('locations:delete')
  @ApiOperation({ summary: 'Delete a location' })
  async delete(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.locationsService.delete(ctx, id);
  }
}
