import {
  doublePrecision,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  address: text('address').notNull(),
  // Geocoded from the address (Google Places) for map pickup markers.
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  isOpen: text('is_open').notNull().default('false'),
  rating: text('rating').notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
