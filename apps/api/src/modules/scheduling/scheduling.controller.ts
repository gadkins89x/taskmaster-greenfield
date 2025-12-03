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
import { SchedulingService } from './scheduling.service';
import {
  CreateMaintenanceScheduleDto,
  UpdateMaintenanceScheduleDto,
  ScheduleStepDto,
} from './dto';

@ApiTags('scheduling')
@ApiBearerAuth()
@Controller('schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post()
  @RequirePermissions('schedules:create')
  @ApiOperation({ summary: 'Create a new maintenance schedule' })
  create(
    @CurrentUser() ctx: TenantContext,
    @Body() dto: CreateMaintenanceScheduleDto,
  ) {
    return this.schedulingService.create(ctx, dto);
  }

  @Get()
  @RequirePermissions('schedules:read')
  @ApiOperation({ summary: 'Get all maintenance schedules' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'assetId', required: false, type: String })
  @ApiQuery({ name: 'locationId', required: false, type: String })
  findAll(
    @CurrentUser() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
    @Query('assetId') assetId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.schedulingService.findAll(ctx, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      isActive: isActive === undefined ? undefined : isActive === true || isActive === 'true' as unknown as boolean,
      assetId,
      locationId,
    });
  }

  @Get('upcoming')
  @RequirePermissions('schedules:read')
  @ApiOperation({ summary: 'Get upcoming scheduled maintenance' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days ahead to look (default 30)' })
  getUpcoming(
    @CurrentUser() ctx: TenantContext,
    @Query('days') days?: number,
  ) {
    return this.schedulingService.getUpcomingSchedules(ctx, days ? Number(days) : 30);
  }

  @Get(':id')
  @RequirePermissions('schedules:read')
  @ApiOperation({ summary: 'Get maintenance schedule by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulingService.findOne(ctx, id);
  }

  @Put(':id')
  @RequirePermissions('schedules:update')
  @ApiOperation({ summary: 'Update maintenance schedule' })
  @ApiParam({ name: 'id', type: String })
  update(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceScheduleDto,
  ) {
    return this.schedulingService.update(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('schedules:delete')
  @ApiOperation({ summary: 'Delete maintenance schedule' })
  @ApiParam({ name: 'id', type: String })
  delete(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulingService.delete(ctx, id);
  }

  @Post(':id/steps')
  @RequirePermissions('schedules:update')
  @ApiOperation({ summary: 'Add a step to a schedule' })
  @ApiParam({ name: 'id', type: String })
  addStep(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleStepDto,
  ) {
    return this.schedulingService.addStep(ctx, id, dto);
  }

  @Delete(':id/steps/:stepId')
  @RequirePermissions('schedules:update')
  @ApiOperation({ summary: 'Remove a step from a schedule' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'stepId', type: String })
  removeStep(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
  ) {
    return this.schedulingService.removeStep(ctx, id, stepId);
  }

  @Post(':id/generate')
  @RequirePermissions('schedules:generate')
  @ApiOperation({ summary: 'Manually generate a work order from schedule' })
  @ApiParam({ name: 'id', type: String })
  generateWorkOrder(
    @CurrentUser() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulingService.generateWorkOrderManually(ctx, id);
  }
}
