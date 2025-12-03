import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, NotificationDeliveryService],
  exports: [NotificationsService, EmailService, NotificationDeliveryService],
})
export class NotificationsModule {}
