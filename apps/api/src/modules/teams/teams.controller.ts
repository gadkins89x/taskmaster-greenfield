import {
  Controller,
  Get,
  Post,
  Patch,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/auth/guards/permissions.guard';
import { RequirePermissions } from '@/common/auth/decorators/permissions.decorator';
import { TenantCtx } from '@/common/auth/decorators/current-user.decorator';
import { TenantContext } from '@/common/auth/strategies/jwt.strategy';
import { TeamsService } from './teams.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  UpdateTeamMemberDto,
} from './dto';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  @RequirePermissions('teams:create')
  create(@TenantCtx() ctx: TenantContext, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(ctx, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teams' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @RequirePermissions('teams:read')
  findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.teamsService.findAll(ctx, {
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a team by ID' })
  @RequirePermissions('teams:read')
  findOne(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamsService.findOne(ctx, id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get a team by code' })
  @RequirePermissions('teams:read')
  findByCode(@TenantCtx() ctx: TenantContext, @Param('code') code: string) {
    return this.teamsService.findByCode(ctx, code);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team' })
  @RequirePermissions('teams:update')
  update(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.update(ctx, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a team' })
  @RequirePermissions('teams:delete')
  remove(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamsService.remove(ctx, id);
  }

  // Team Member Management

  @Get(':id/members')
  @ApiOperation({ summary: 'Get team members' })
  @RequirePermissions('teams:read')
  getMembers(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teamsService.getTeamMembers(ctx, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to the team' })
  @RequirePermissions('teams:update')
  addMember(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.teamsService.addMember(ctx, id, dto);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update a team member' })
  @RequirePermissions('teams:update')
  updateMember(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.teamsService.updateMember(ctx, id, userId, dto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the team' })
  @RequirePermissions('teams:update')
  removeMember(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.teamsService.removeMember(ctx, id, userId);
  }
}
