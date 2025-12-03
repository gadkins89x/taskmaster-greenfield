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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { TenantCtx } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';
import {
  MarkNotificationsReadDto,
  UpdateNotificationPreferenceDto,
  NotificationType,
} from './dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  async findAll(
    @TenantCtx() ctx: TenantContext,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('type') type?: NotificationType,
  ) {
    return this.notificationsService.findAll(ctx, {
      page,
      limit,
      unreadOnly,
      type,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@TenantCtx() ctx: TenantContext) {
    const count = await this.notificationsService.getUnreadCount(ctx);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.notificationsService.markAsRead(ctx, id);
  }

  @Post('mark-read')
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  async markManyAsRead(
    @TenantCtx() ctx: TenantContext,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    return this.notificationsService.markManyAsRead(ctx, dto.notificationIds);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@TenantCtx() ctx: TenantContext) {
    return this.notificationsService.markAllAsRead(ctx);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async delete(@TenantCtx() ctx: TenantContext, @Param('id') id: string) {
    return this.notificationsService.delete(ctx, id);
  }

  @Delete('cleanup/old')
  @ApiOperation({ summary: 'Delete old read notifications' })
  @ApiQuery({ name: 'olderThanDays', required: false, type: Number })
  async deleteOld(
    @TenantCtx() ctx: TenantContext,
    @Query('olderThanDays') olderThanDays?: number,
  ) {
    return this.notificationsService.deleteOldNotifications(ctx, olderThanDays);
  }

  // ============================================================================
  // Preferences endpoints
  // ============================================================================

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@TenantCtx() ctx: TenantContext) {
    return this.notificationsService.getPreferences(ctx);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update a notification preference' })
  async updatePreference(
    @TenantCtx() ctx: TenantContext,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(ctx, dto);
  }
}
