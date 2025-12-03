import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { TenantCtx } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List all roles in tenant' })
  async findAll(@TenantCtx() ctx: TenantContext) {
    return this.rolesService.findAll(ctx);
  }

  @Get('permissions')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'List all available permissions' })
  async findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }
}
