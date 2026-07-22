import type { DriverStatus } from '@food-delivery/types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { users } from '../../core/database/schema/users';

@Injectable()
export class DriversService {
  constructor(private readonly database: DatabaseService) {}

  /** The driver's current online/offline availability. */
  async getStatus(driverId: string): Promise<DriverStatus> {
    const driver = await this.database.db.query.users.findFirst({
      where: eq(users.id, driverId),
      columns: { isOnline: true },
    });
    return { isOnline: driver?.isOnline ?? false };
  }

  /** Sets whether the driver is online and accepting deliveries. */
  async setAvailability(
    driverId: string,
    isOnline: boolean,
  ): Promise<DriverStatus> {
    await this.database.db
      .update(users)
      .set({ isOnline, updatedAt: new Date() })
      .where(eq(users.id, driverId));

    return { isOnline };
  }

  /**
   * Picks a random currently-online driver, or null if none are available.
   * `excludeIds` skips specific drivers (e.g. one who just declined the order).
   */
  async pickRandomAvailableDriver(
    excludeIds: string[] = [],
  ): Promise<string | null> {
    const conditions = [eq(users.role, 'DRIVER'), eq(users.isOnline, true)];
    if (excludeIds.length > 0) {
      conditions.push(notInArray(users.id, excludeIds));
    }

    const [driver] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .orderBy(sql`random()`)
      .limit(1);

    return driver?.id ?? null;
  }

  /** Ensures a user id refers to an existing driver; throws otherwise. */
  async assertAssignableDriver(driverId: string): Promise<void> {
    const driver = await this.database.db.query.users.findFirst({
      where: and(eq(users.id, driverId), eq(users.role, 'DRIVER')),
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
  }
}
