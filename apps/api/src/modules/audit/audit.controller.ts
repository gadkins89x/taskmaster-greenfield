import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { TenantCtx } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Search audit logs with filters' })
  async findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.findAll(ctx.tenantId, {
      page,
      limit,
      entityType,
      entityId,
      userId,
      action,
      startDate,
      endDate,
    });
  }

  @Get('entity-types')
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Get list of entity types with counts' })
  async getEntityTypes(@TenantCtx() ctx: TenantContext) {
    return this.auditService.getEntityTypes(ctx.tenantId);
  }

  @Get('stats')
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Get audit statistics' })
  async getStats(
    @TenantCtx() ctx: TenantContext,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    return this.auditService.getStats(ctx.tenantId, period);
  }

  @Get('entity/:entityType/:entityId')
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  async findByEntity(
    @TenantCtx() ctx: TenantContext,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(ctx.tenantId, entityType, entityId);
  }
}
