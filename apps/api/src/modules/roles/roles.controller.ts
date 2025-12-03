import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
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

  @Get(':id')
  @Permissions('roles:read')
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.rolesService.findById(ctx, id);
  }

  @Post()
  @Permissions('roles:create')
  @ApiOperation({ summary: 'Create a new role' })
  async create(
    @TenantCtx() ctx: TenantContext,
    @Body() body: {
      name: string;
      description?: string;
      permissionIds?: string[];
    },
  ) {
    return this.rolesService.create(ctx, body);
  }

  @Patch(':id')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Update a role' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
    },
  ) {
    return this.rolesService.update(ctx, id, body);
  }

  @Delete(':id')
  @Permissions('roles:delete')
  @ApiOperation({ summary: 'Delete a role' })
  async delete(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.rolesService.delete(ctx, id);
  }

  @Put(':id/permissions')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  async assignPermissions(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.rolesService.assignPermissions(ctx, id, body.permissionIds);
  }
}
