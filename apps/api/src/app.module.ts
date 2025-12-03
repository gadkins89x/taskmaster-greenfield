import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Common modules
import { DatabaseModule } from './common/database/database.module';
import { AuthModule } from './common/auth/auth.module';

// Feature modules
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { LocationsModule } from './modules/locations/locations.module';
import { AssetsModule } from './modules/assets/assets.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './health/health.module';

import { configSchema } from './common/config/config.schema';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => configSchema.parse(config),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Scheduling
    ScheduleModule.forRoot(),

    // Common modules
    DatabaseModule,
    AuthModule,

    // Feature modules
    TenantsModule,
    UsersModule,
    RolesModule,
    AuthenticationModule,
    LocationsModule,
    AssetsModule,
    WorkOrdersModule,
    InventoryModule,
    AuditModule,
    HealthModule,
  ],
})
export class AppModule {}
