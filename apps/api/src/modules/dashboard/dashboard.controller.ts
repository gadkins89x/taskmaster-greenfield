import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { TenantCtx } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats(@TenantCtx() ctx: TenantContext) {
    return this.dashboardService.getStats(ctx);
  }

  @Get('work-order-trends')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get work order trends over time' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  async getWorkOrderTrends(
    @TenantCtx() ctx: TenantContext,
    @Query('period') period?: string,
  ) {
    return this.dashboardService.getWorkOrderTrends(ctx, period);
  }

  @Get('work-orders-by-priority')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get work orders count by priority' })
  async getWorkOrdersByPriority(@TenantCtx() ctx: TenantContext) {
    return this.dashboardService.getWorkOrdersByPriority(ctx);
  }

  @Get('work-orders-by-type')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get work orders count by type' })
  async getWorkOrdersByType(@TenantCtx() ctx: TenantContext) {
    return this.dashboardService.getWorkOrdersByType(ctx);
  }

  @Get('work-orders-by-status')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get work orders count by status' })
  async getWorkOrdersByStatus(@TenantCtx() ctx: TenantContext) {
    return this.dashboardService.getWorkOrdersByStatus(ctx);
  }

  @Get('technician-performance')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get technician performance metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTechnicianPerformance(
    @TenantCtx() ctx: TenantContext,
    @Query('period') period?: string,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getTechnicianPerformance(ctx, period, limit ?? 10);
  }

  @Get('recent-activity')
  @Permissions('work_orders:read')
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentActivity(
    @TenantCtx() ctx: TenantContext,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getRecentActivity(ctx, limit ?? 20);
  }

  @Get('asset-health')
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Get asset health metrics' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['healthScore', 'workOrders', 'lastMaintenance'] })
  async getAssetHealth(
    @TenantCtx() ctx: TenantContext,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.dashboardService.getAssetHealth(ctx, limit ?? 10, sortBy ?? 'healthScore');
  }
}
