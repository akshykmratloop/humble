import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { StorageModule } from './common/storage/storage.module';
import { correlationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    StorageModule,
    HealthModule,
    AuthModule,
    ProfilesModule,
    UploadsModule,
  ],
})
export class AppModule {
  configure(consumer) {
    consumer.apply(correlationIdMiddleware).forRoutes('*');
  }
}
