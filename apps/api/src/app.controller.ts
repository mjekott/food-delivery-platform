import type { HealthCheckResponse } from '@food-delivery/types';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from './core/database/database.service';
import { Public } from './features/auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly database: DatabaseService) {}

  @Public()
  @Get('health-check')
  async getHealth(): Promise<HealthCheckResponse> {
    try {
      await this.database.db.execute(sql`SELECT 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date(),
        database: 'down',
      } satisfies HealthCheckResponse);
    }

    return { status: 'ok', timestamp: new Date(), database: 'up' };
  }
}
