import { ConfigService } from '@nestjs/config';

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
  tls?: Record<string, never>;
}

/**
 * Resolve Redis connection options from env in this priority:
 *   1. REDIS_URL (preferred — single connection string, supports auth + TLS)
 *   2. REDIS_HOST / REDIS_PORT / REDIS_PASSWORD / REDIS_USERNAME / REDIS_DB
 *
 * Format for REDIS_URL:
 *   redis://[:password@]host:port[/db]
 *   rediss://...                       ← TLS variant
 *   redis://username:password@host:port/0
 */
export function resolveRedisOptions(
  configService: ConfigService,
): RedisConnectionOptions {
  const url = configService.get<string>('REDIS_URL');
  if (url) {
    const parsed = new URL(url);
    const opts: RedisConnectionOptions = {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
    };
    if (parsed.password) opts.password = decodeURIComponent(parsed.password);
    if (parsed.username) opts.username = decodeURIComponent(parsed.username);
    if (parsed.pathname && parsed.pathname.length > 1) {
      const db = Number(parsed.pathname.slice(1));
      if (!Number.isNaN(db)) opts.db = db;
    }
    if (parsed.protocol === 'rediss:') opts.tls = {};
    return opts;
  }

  const opts: RedisConnectionOptions = {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
  };
  const password = configService.get<string>('REDIS_PASSWORD');
  if (password) opts.password = password;
  const username = configService.get<string>('REDIS_USERNAME');
  if (username) opts.username = username;
  const db = configService.get<string>('REDIS_DB');
  if (db) opts.db = Number(db);
  if (configService.get<string>('REDIS_TLS') === 'true') opts.tls = {};
  return opts;
}

/**
 * Build a redis:// URL string from env. Used by libraries that only accept
 * connection strings (e.g. @keyv/redis).
 */
export function resolveRedisUrl(configService: ConfigService): string {
  const url = configService.get<string>('REDIS_URL');
  if (url) return url;

  const opts = resolveRedisOptions(configService);
  const scheme = opts.tls ? 'rediss' : 'redis';
  const auth = opts.password
    ? `${opts.username ? encodeURIComponent(opts.username) : ''}:${encodeURIComponent(opts.password)}@`
    : '';
  const path = opts.db !== undefined ? `/${opts.db}` : '';
  return `${scheme}://${auth}${opts.host}:${opts.port}${path}`;
}
