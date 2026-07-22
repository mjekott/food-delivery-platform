import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { orders } from './orders';
import { restaurants } from './restaurant';
import { users } from './users';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id').references(() => users.id),
    restaurantRating: integer('restaurant_rating').notNull(),
    driverRating: integer('driver_rating'),
    comment: text('comment'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    check(
      'restaurant_rating_range',
      sql`${table.restaurantRating} >= 1 AND ${table.restaurantRating} <= 5`,
    ),
    check(
      'driver_rating_range',
      sql`${table.driverRating} >= 1 AND ${table.driverRating} <= 5`,
    ),
  ],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
