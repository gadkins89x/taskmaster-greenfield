import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
