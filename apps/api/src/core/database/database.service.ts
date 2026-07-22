import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DrizzleDB = NodePgDatabase<typeof schema>;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  public readonly db: DrizzleDB;

  constructor(configService: ConfigService) {
    this.pool = new Pool({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
