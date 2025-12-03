import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { TenantContext } from '../../common/auth/strategies/jwt.strategy';

@ApiTags('push-notifications')
@ApiBearerAuth()
@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushSubscriptionController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for push subscription' })
  getVapidPublicKey() {
    const publicKey = this.pushService.getVapidPublicKey();
    return { publicKey };
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  async subscribe(
    @CurrentUser() user: TenantContext,
    @Body() body: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
  ) {
    await this.pushService.subscribe(user.userId, body);
    return { success: true, message: 'Push subscription registered' };
  }

  @Delete('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  async unsubscribe(
    @Body() body: { endpoint: string },
  ) {
    await this.pushService.unsubscribe(body.endpoint);
    return { success: true, message: 'Push subscription removed' };
  }

  @Delete('unsubscribe-all')
  @ApiOperation({ summary: 'Remove all push subscriptions for current user' })
  async unsubscribeAll(
    @CurrentUser() user: TenantContext,
  ) {
    await this.pushService.unsubscribeUser(user.userId);
    return { success: true, message: 'All push subscriptions removed' };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get push notification status for current user' })
  async getStatus(
    @CurrentUser() user: TenantContext,
  ) {
    const subscriptionCount = await this.pushService.getUserSubscriptionCount(user.userId);
    return {
      isConfigured: this.pushService.getVapidPublicKey() !== null,
      subscriptionCount,
    };
  }
}
