import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { TenantCtx } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import { Audit } from '../../common/decorators/audit.decorator';

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
  @Audit({ entityType: 'WorkOrder' })
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
  @Audit({ entityType: 'WorkOrder', idParam: 'id' })
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
  @Audit({ entityType: 'WorkOrder', idParam: 'id' })
  @ApiOperation({ summary: 'Start working on a work order' })
  async start(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.workOrdersService.start(ctx, id);
  }

  @Post(':id/complete')
  @Permissions('work_orders:update')
  @Audit({ entityType: 'WorkOrder', idParam: 'id' })
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

  // ============================================================================
  // Comments
  // ============================================================================

  @Get(':id/comments')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get comments for a work order' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeInternal', required: false, type: Boolean })
  async getComments(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('includeInternal') includeInternal?: boolean,
  ) {
    return this.workOrdersService.getComments(ctx, id, { page, limit, includeInternal });
  }

  @Post(':id/comments')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Add a comment to a work order' })
  async addComment(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
      content: string;
      parentId?: string;
      isInternal?: boolean;
    },
  ) {
    return this.workOrdersService.addComment(ctx, id, body);
  }

  @Patch(':id/comments/:commentId')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Update a comment' })
  async updateComment(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Body() body: { content: string },
  ) {
    return this.workOrdersService.updateComment(ctx, id, commentId, body);
  }

  @Delete(':id/comments/:commentId')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.workOrdersService.deleteComment(ctx, id, commentId);
  }

  // ============================================================================
  // Activity Feed
  // ============================================================================

  @Get(':id/activity')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get activity feed for a work order' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getActivityFeed(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.workOrdersService.getActivityFeed(ctx, id, { page, limit });
  }

  // ============================================================================
  // Steps
  // ============================================================================

  @Post(':id/steps/:stepId/complete')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Mark a step as completed' })
  async completeStep(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() body: { completionNotes?: string },
  ) {
    return this.workOrdersService.completeStep(ctx, id, stepId, body);
  }

  @Post(':id/steps/:stepId/uncomplete')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Mark a step as not completed' })
  async uncompleteStep(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
  ) {
    return this.workOrdersService.uncompleteStep(ctx, id, stepId);
  }

  // ============================================================================
  // Photos
  // ============================================================================

  @Post(':id/photos')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Upload a photo to a work order' })
  async uploadPhoto(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
      dataUrl: string;
      filename: string;
      caption?: string;
      category?: string;
    },
  ) {
    return this.workOrdersService.uploadPhoto(ctx, id, body);
  }

  @Patch(':id/photos/:photoId')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Update photo caption/category' })
  async updatePhoto(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Body() body: { caption?: string; category?: string },
  ) {
    return this.workOrdersService.updatePhoto(ctx, id, photoId, body);
  }

  @Delete(':id/photos/:photoId')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Delete a photo' })
  async deletePhoto(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.workOrdersService.deletePhoto(ctx, id, photoId);
  }

  // ============================================================================
  // Labor Tracking
  // ============================================================================

  @Post(':id/labor')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Add a labor entry' })
  async addLaborEntry(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
      startTime: string;
      endTime?: string;
      hours?: number;
      description?: string;
      laborType?: string;
    },
  ) {
    return this.workOrdersService.addLaborEntry(ctx, id, body);
  }

  @Patch(':id/labor/:laborId')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Update a labor entry' })
  async updateLaborEntry(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('laborId') laborId: string,
    @Body() body: {
      startTime?: string;
      endTime?: string;
      hours?: number;
      description?: string;
      laborType?: string;
    },
  ) {
    return this.workOrdersService.updateLaborEntry(ctx, id, laborId, body);
  }

  @Delete(':id/labor/:laborId')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Delete a labor entry' })
  async deleteLaborEntry(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('laborId') laborId: string,
  ) {
    return this.workOrdersService.deleteLaborEntry(ctx, id, laborId);
  }

  @Post(':id/labor/start')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Start labor timer' })
  async startLaborTimer(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    return this.workOrdersService.startLaborTimer(ctx, id);
  }

  @Post(':id/labor/:laborId/stop')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Stop labor timer' })
  async stopLaborTimer(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('laborId') laborId: string,
    @Body() body?: { description?: string },
  ) {
    return this.workOrdersService.stopLaborTimer(ctx, id, laborId, body);
  }

  // ============================================================================
  // Parts
  // ============================================================================

  @Post(':id/parts')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Add a part to work order' })
  async addPart(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
      inventoryItemId?: string;
      partNumber?: string;
      partName: string;
      quantity: number;
      unitCost?: number;
      notes?: string;
    },
  ) {
    return this.workOrdersService.addPart(ctx, id, body);
  }

  @Patch(':id/parts/:partId')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Update a part' })
  async updatePart(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('partId') partId: string,
    @Body() body: {
      quantity?: number;
      unitCost?: number;
      notes?: string;
      status?: string;
    },
  ) {
    return this.workOrdersService.updatePart(ctx, id, partId, body);
  }

  @Delete(':id/parts/:partId')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Delete a part' })
  async deletePart(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('partId') partId: string,
  ) {
    return this.workOrdersService.deletePart(ctx, id, partId);
  }

  @Post(':id/parts/:partId/return')
  @Permissions('work_orders:update')
  @ApiOperation({ summary: 'Return a part to inventory' })
  async returnPart(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Param('partId') partId: string,
    @Body() body: { quantity: number; notes?: string },
  ) {
    return this.workOrdersService.returnPart(ctx, id, partId, body);
  }
}
