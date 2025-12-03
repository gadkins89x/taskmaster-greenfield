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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { TenantCtx } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'List all users in tenant' })
  async findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(ctx, { page, limit, search });
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.usersService.findById(ctx, id);
  }

  @Post()
  @Permissions('users:create')
  @ApiOperation({ summary: 'Create a new user' })
  async create(
    @TenantCtx() ctx: TenantContext,
    @Body() body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      roleIds?: string[];
    },
  ) {
    return this.usersService.create(ctx, body);
  }

  @Patch(':id')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Update a user' })
  async update(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatarUrl?: string;
    },
  ) {
    return this.usersService.update(ctx, id, body);
  }

  @Patch(':id/password')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Update user password' })
  async updatePassword(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.usersService.updatePassword(ctx, id, body.password);
  }

  @Post(':id/deactivate')
  @Permissions('users:delete')
  @ApiOperation({ summary: 'Deactivate a user' })
  async deactivate(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.usersService.deactivate(ctx, id);
  }

  @Post(':id/activate')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Activate a user' })
  async activate(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.usersService.activate(ctx, id);
  }

  @Patch(':id/roles')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Assign roles to a user' })
  async assignRoles(
    @TenantCtx() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: { roleIds: string[] },
  ) {
    return this.usersService.assignRoles(ctx, id, body.roleIds);
  }
}
