import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { loadConfig } from '@humble/config';

/**
 * Ephemeral state only (docs/05-hld.md §8): rate-limit counters, Kill Streak
 * grace-window helpers, cache. Never the source of truth for durable data.
 */
@Injectable()
export class RedisService {
  constructor() {
    const { REDIS_URL } = loadConfig();
    this.client = new Redis(REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });
  }

  getClient() {
    return this.client;
  }

  /**
   * Fixed-window rate limiter. Returns true if the action is allowed.
   * @param {string} key
   * @param {number} max
   * @param {number} windowSeconds
   */
  async allowWithinLimit(key, max, windowSeconds) {
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }
    return count <= max;
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
