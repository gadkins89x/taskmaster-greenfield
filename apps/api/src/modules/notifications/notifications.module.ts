import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushSubscriptionController } from './push-subscription.controller';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [NotificationsController, PushSubscriptionController],
  providers: [NotificationsService, EmailService, PushService, NotificationDeliveryService],
  exports: [NotificationsService, EmailService, PushService, NotificationDeliveryService],
})
export class NotificationsModule {}
