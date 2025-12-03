import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { TenantCtx } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('work-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'List all work orders' })
  async findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('assetId') assetId?: string,
  ) {
    return this.workOrdersService.findAll(ctx, {
      page,
      limit,
      search,
      status: status?.split(','),
      priority: priority?.split(','),
      assignedToId,
      assetId,
    });
  }

  @Get(':id')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get work order by ID' })
  async findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.workOrdersService.findById(ctx, id);
  }

  @Post()
  @Permissions('work_orders:create')
  @ApiOperation({ summary: 'Create a new work order' })
  async create(
    @TenantCtx() ctx: TenantContext,
    @Body() body: {
      title: string;
      description?: string;
      priority: string;
      type: string;
      assetId?: string;
      locationId?: string;
      assignedToId?: string;
      dueDate?: string;
      estimatedHours?: number;
      steps?: { title: string; description?: string; isRequired?: boolean }[];
    },
  ) {
    return this.workOrdersService.create(ctx, body);
  }

  @Patch(':id')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Update a work order' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      description?: string;
      priority?: string;
      assignedToId?: string;
      dueDate?: string;
      estimatedHours?: number;
      expectedVersion: number;
    },
  ) {
    return this.workOrdersService.update(ctx, id, body);
  }

  @Post(':id/start')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Start working on a work order' })
  async start(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.workOrdersService.start(ctx, id);
  }

  @Post(':id/complete')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Complete a work order' })
  async complete(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
      completionNotes?: string;
      actualHours?: number;
      expectedVersion: number;
    },
  ) {
    return this.workOrdersService.complete(ctx, id, body);
  }
}
