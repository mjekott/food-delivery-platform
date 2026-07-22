import KeyvRedis from '@keyv/redis';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';
import { resolveRedisUrl } from '../redis/redis.config';
import { CacheService } from './cache.service';

// Global so any feature can inject CacheService without importing this module.
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'KEYV_INSTANCE',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Keyv({
          store: new KeyvRedis(resolveRedisUrl(configService)),
        });
      },
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class AppCacheModule {}
