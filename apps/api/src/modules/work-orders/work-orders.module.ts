import { Module, forwardRef } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => NotificationsModule)],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
