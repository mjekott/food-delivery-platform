import { Inject, Injectable, Logger } from '@nestjs/common';
import { Keyv } from 'keyv';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject('KEYV_INSTANCE') private keyv: Keyv) {}

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value, or undefined if not found
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.keyv.get(key);
    } catch (error) {
      this.logger.error(
        `Error getting cache key ${key}: ${(error as Error).message}`,
      );
      return undefined;
    }
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional, defaults to module configuration)
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      // keyv expects TTL in milliseconds
      if (ttl !== undefined) {
        await this.keyv.set(key, value, ttl * 1000);
      } else {
        await this.keyv.set(key, value);
      }
    } catch (error) {
      this.logger.error(
        `Error setting cache key ${key}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Remove a value from the cache
   * @param key Cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.keyv.delete(key);
    } catch (error) {
      this.logger.error(
        `Error deleting cache key ${key}: ${(error as Error).message}`,
      );
    }
  }
}
