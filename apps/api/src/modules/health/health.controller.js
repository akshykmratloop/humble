import { Controller, Get, Dependencies, ServiceUnavailableException } from '@nestjs/common';
import { PRISMA } from '../../common/database/database.module';
import { RedisService } from '../../common/redis/redis.service';

@Controller()
@Dependencies(PRISMA, RedisService)
export class HealthController {
  constructor(prisma, redisService) {
    this.prisma = prisma;
    this.redisService = redisService;
  }

  @Get('health')
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness() {
    const checks = { database: false, redis: false };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      // left false — reported below
    }
    try {
      await this.redisService.getClient().ping();
      checks.redis = true;
    } catch {
      // left false — reported below
    }

    const ready = checks.database && checks.redis;
    if (!ready) {
      throw new ServiceUnavailableException({ status: 'not_ready', checks });
    }
    return { status: 'ready', checks };
  }
}
