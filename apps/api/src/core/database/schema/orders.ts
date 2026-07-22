import {
  doublePrecision,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { menuItems } from './menu';
import { restaurants } from './restaurant';
import { users } from './users';

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING', // placed waiting for payment
  'CONFIRMED', // payment confirmed
  'PREPARING', // restaurant is preparing the order
  'READY', // order is ready for pickup
  'OUT_FOR_DELIVERY', // order is out for delivery
  'DELIVERED', // order has been delivered
  'CANCELLED', // cancelled by user or restaurant
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => users.id),
  restaurantId: uuid('restaurant_id')
    .notNull()
    .references(() => restaurants.id),
  driverId: uuid('driver_id').references(() => users.id),
  // When the assigned driver accepted the delivery (null until accepted).
  acceptedAt: timestamp('accepted_at'),
  status: orderStatusEnum('status').notNull().default('PENDING'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  // Customer delivery coordinates (Google Places) for the map destination marker.
  deliveryLat: doublePrecision('delivery_lat'),
  deliveryLng: doublePrecision('delivery_lng'),
  // Payment gateway used (e.g. 'paystack') and its transaction reference.
  paymentProvider: text('payment_provider'),
  paymentReference: text('payment_reference'),
  // When an unpaid (PENDING) order stops being payable.
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: uuid('menu_item_id')
    .notNull()
    .references(() => menuItems.id, { onDelete: 'cascade' }),
  quantity: numeric('quantity').notNull(),
  unitPrice: numeric('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
