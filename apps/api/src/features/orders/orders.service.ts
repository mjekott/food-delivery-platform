import {
  OrderStatus,
  UserRole,
  type AuthUser,
  type DriverLocation,
  type DriverStats,
  type RestaurantAnalytics,
} from '@food-delivery/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  notInArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { DriversService } from '../drivers/drivers.service';
import { menuItems } from '../../core/database/schema/menu';
import { users } from '../../core/database/schema/users';
import {
  orderItems,
  orders,
  type NewOrder,
  type NewOrderItem,
  type Order,
  type OrderItem,
} from '../../core/database/schema/orders';
import { paginate, type PaginatedResult } from '../../core/pagination';
import { CacheService } from '../../core/cache/cache.service';
import {
  PAYMENT_PROVIDER,
  PaystackService,
} from '../payments/paystack.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { OrdersGateway } from './orders.gateway';

type OrderStatusValue = Order['status'];

/**
 * The one status transition each role may perform from a given current status.
 * Anything not listed here is rejected — this is the order lifecycle:
 *   PENDING → CONFIRMED (payment) → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
 * Customers place/pay/cancel (handled separately); owners and drivers advance
 * their own steps below.
 */
const ROLE_TRANSITIONS: Partial<
  Record<UserRole, Partial<Record<OrderStatusValue, OrderStatusValue>>>
> = {
  [UserRole.RESTAURANT_OWNER]: {
    CONFIRMED: 'PREPARING',
    PREPARING: 'READY',
  },
  [UserRole.DRIVER]: {
    READY: 'OUT_FOR_DELIVERY',
    OUT_FOR_DELIVERY: 'DELIVERED',
  },
  [UserRole.ADMIN]: {
    CONFIRMED: 'PREPARING',
    PREPARING: 'READY',
    READY: 'OUT_FOR_DELIVERY',
    OUT_FOR_DELIVERY: 'DELIVERED',
  },
};

/** An order line enriched with its menu item's name. */
export type OrderItemDetail = OrderItem & { name: string };

/** An order enriched with the customer's name (joined on read). */
export type OrderWithCustomer = Order & { customerName: string | null };

/** Serializes to `@food-delivery/types` `OrderWithItems` over the wire. */
export type OrderWithItems = OrderWithCustomer & { items: OrderItemDetail[] };

export interface PaymentInit {
  authorizationUrl: string;
  reference: string;
}

/** How long an unpaid (PENDING) order stays payable. */
const ORDER_EXPIRY_MS = 30 * 60 * 1000;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly restaurantsService: RestaurantsService,
    private readonly paystack: PaystackService,
    private readonly driversService: DriversService,
    private readonly cache: CacheService,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly gateway: OrdersGateway,
  ) {}

  /** Cancels unpaid orders past their payment window, once a minute. */
  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredOrders(): Promise<void> {
    const count = await this.expireStale();
    if (count > 0) {
      this.logger.log(`Auto-cancelled ${count} expired unpaid order(s)`);
    }
  }

  /**
   * Places an order for the customer. The total and per-line unit prices are
   * computed from the database, never trusted from the client.
   */
  async create(user: AuthUser, dto: CreateOrderDto): Promise<OrderWithItems> {
    // Ensure the restaurant exists (throws NotFound otherwise).
    await this.restaurantsService.findOne(dto.restaurantId);

    const ids = dto.items.map((line) => line.menuItemId);
    const menu = await this.database.db.query.menuItems.findMany({
      where: and(
        inArray(menuItems.id, ids),
        eq(menuItems.restaurantId, dto.restaurantId),
      ),
    });
    const byId = new Map(menu.map((item) => [item.id, item]));

    for (const line of dto.items) {
      const menuItem = byId.get(line.menuItemId);
      if (!menuItem) {
        throw new NotFoundException(
          `Menu item ${line.menuItemId} is not on this restaurant's menu`,
        );
      }
      if (!menuItem.isAvailable) {
        throw new BadRequestException(`${menuItem.name} is sold out`);
      }
    }

    const total = dto.items.reduce((sum, line) => {
      const menuItem = byId.get(line.menuItemId)!;
      return sum + Number(menuItem.price) * line.quantity;
    }, 0);

    // A driver is assigned only once payment is confirmed (see markConfirmed),
    // so we never tie up a driver on an unpaid order that may expire.
    return this.database.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          customerId: user.id,
          restaurantId: dto.restaurantId,
          totalAmount: total.toFixed(2),
          deliveryAddress: dto.deliveryAddress,
          deliveryLat: dto.deliveryLat,
          deliveryLng: dto.deliveryLng,
          expiresAt: new Date(Date.now() + ORDER_EXPIRY_MS),
        })
        .returning();

      const newItems: NewOrderItem[] = dto.items.map((line) => ({
        orderId: order.id,
        menuItemId: line.menuItemId,
        quantity: String(line.quantity),
        unitPrice: byId.get(line.menuItemId)!.price,
      }));

      const inserted = await tx.insert(orderItems).values(newItems).returning();
      const items = inserted.map((item) => ({
        ...item,
        name: byId.get(item.menuItemId)!.name,
      }));

      return {
        ...order,
        customerName: `${user.firstName} ${user.lastName}`,
        items,
      };
    });
  }

  /**
   * Lists the caller's orders, scoped by role:
   * - CUSTOMER          → orders they placed
   * - DRIVER            → orders assigned to them
   * - RESTAURANT_OWNER  → orders for their restaurant
   * - ADMIN             → all orders
   */
  async findAll(
    user: AuthUser,
    query: FindOrdersQueryDto,
  ): Promise<PaginatedResult<OrderWithCustomer>> {
    await this.expireStale();
    const scope = await this.scopeFor(user);

    // A restaurant owner without a restaurant has no orders.
    if (scope === null) {
      return {
        items: [],
        meta: {
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const where = and(
      scope,
      query.status ? eq(orders.status, query.status) : undefined,
      query.active
        ? notInArray(orders.status, ['DELIVERED', 'CANCELLED'])
        : undefined,
    );

    const page = await paginate<Order>(this.database.db, orders, {
      page: query.page,
      limit: query.limit,
      where,
      orderBy: desc(orders.createdAt),
    });
    return { ...page, items: await this.attachCustomerNames(page.items) };
  }

  async findOne(user: AuthUser, id: string): Promise<OrderWithItems> {
    await this.expireStale();
    const order = await this.authorizeView(user, id);
    return this.withItems(order);
  }

  /**
   * Loads an order and asserts the caller may view it. Shared by the REST
   * detail route and the gateway's room subscription. Throws NotFound /
   * Forbidden.
   */
  async authorizeView(
    user: Pick<AuthUser, 'id' | 'role'>,
    id: string,
  ): Promise<Order> {
    const order = await this.database.db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.assertCanView(user, order);
    return order;
  }

  /**
   * The pool of orders drivers can claim: marked READY by the restaurant and
   * not yet taken by any driver. Oldest first (FIFO pickup queue).
   */
  async findAvailable(
    query: FindOrdersQueryDto,
  ): Promise<PaginatedResult<OrderWithCustomer>> {
    const page = await paginate<Order>(this.database.db, orders, {
      page: query.page,
      limit: query.limit,
      where: and(eq(orders.status, 'READY'), isNull(orders.driverId)),
      orderBy: asc(orders.createdAt),
    });
    return { ...page, items: await this.attachCustomerNames(page.items) };
  }

  // ----- Payments -----

  /**
   * Initializes a Paystack payment for a PENDING order and returns the checkout
   * URL. Rejects if the order is not payable (wrong status or expired).
   */
  async initializePayment(
    user: AuthUser,
    orderId: string,
    callbackUrl?: string,
  ): Promise<PaymentInit> {
    await this.expireStale();
    const order = await this.loadCustomerOrder(user, orderId);
    this.assertPayable(order);

    const { authorizationUrl, reference } =
      await this.paystack.initializeTransaction({
        email: user.email,
        amountKobo: Math.round(Number(order.totalAmount) * 100),
        callbackUrl,
        metadata: { orderId: order.id },
      });

    await this.database.db
      .update(orders)
      .set({
        paymentProvider: PAYMENT_PROVIDER,
        paymentReference: reference,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    return { authorizationUrl, reference };
  }

  /**
   * Verifies the order's payment with Paystack. On success the order moves to
   * CONFIRMED (ongoing); otherwise it is returned unchanged.
   */
  async verifyPayment(
    user: AuthUser,
    orderId: string,
  ): Promise<OrderWithItems> {
    await this.expireStale();
    const order = await this.loadCustomerOrder(user, orderId);

    // Already past payment → idempotent no-op.
    if (order.status !== 'PENDING') {
      return this.withItems(order);
    }
    this.assertPayable(order);

    if (!order.paymentReference) {
      throw new BadRequestException('No payment has been initialized');
    }

    const paid = await this.paystack.isTransactionPaid(order.paymentReference);
    if (!paid) {
      return this.withItems(order);
    }

    return this.markConfirmed(order.id);
  }

  /** Confirms an order from an already signature-verified Paystack webhook. */
  async confirmByReference(reference: string): Promise<void> {
    const order = await this.database.db.query.orders.findFirst({
      where: eq(orders.paymentReference, reference),
    });
    if (!order || order.status !== 'PENDING') return;

    const paid = await this.paystack.isTransactionPaid(reference);
    if (paid) await this.markConfirmed(order.id);
  }

  /**
   * Lets the customer cancel their order before it is paid for. Cancelled
   * orders are removed from the system entirely (they were never paid).
   */
  async cancelOrder(user: AuthUser, orderId: string): Promise<Order> {
    const order = await this.loadCustomerOrder(user, orderId);
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Only orders awaiting payment can be cancelled',
      );
    }

    const [deleted] = await this.database.db
      .delete(orders)
      .where(eq(orders.id, orderId))
      .returning();

    this.gateway.emitOrderDeleted(deleted);
    return deleted;
  }

  // ----- Fulfillment -----

  /**
   * Advances an order to `target` if that transition is allowed for the
   * caller's role from the order's current status. A driver moving a READY
   * order to OUT_FOR_DELIVERY thereby claims the delivery. Broadcasts the change.
   */
  async updateStatus(
    user: AuthUser,
    orderId: string,
    target: OrderStatus,
  ): Promise<OrderWithItems> {
    const order = await this.database.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.assertCanUpdate(user, order);

    const next = ROLE_TRANSITIONS[user.role]?.[order.status];
    if (!next || next !== (target as OrderStatusValue)) {
      throw new BadRequestException(
        `Cannot move order from ${order.status} to ${target}`,
      );
    }

    const patch: Partial<NewOrder> = {
      status: next,
      updatedAt: new Date(),
    };

    // Picking up a READY order: an unassigned order is claimed (implicit
    // acceptance); a pre-assigned order must have been accepted first.
    if (user.role === UserRole.DRIVER && order.status === 'READY') {
      if (order.driverId === null) {
        patch.driverId = user.id;
        patch.acceptedAt = new Date();
      } else if (!order.acceptedAt) {
        throw new BadRequestException(
          'You must accept this order before picking it up',
        );
      }
    }

    const [updated] = await this.database.db
      .update(orders)
      .set(patch)
      .where(eq(orders.id, orderId))
      .returning();

    const result = await this.withItems(updated);
    this.gateway.emitOrderUpdate(result);

    // Restaurant just made it READY and no driver has it → advertise to drivers.
    if (result.status === 'READY' && !result.driverId) {
      this.gateway.emitOrderAvailable(result);
    }
    return result;
  }

  /**
   * Manually (re)assigns an order to a specific driver. Allowed for the owning
   * restaurant or an admin. Broadcasts so the new driver is notified.
   */
  async assignDriver(
    actor: AuthUser,
    orderId: string,
    driverId: string,
  ): Promise<OrderWithItems> {
    const order = await this.getOrderOrThrow(orderId);

    await this.assertCanAssign(actor, order);
    await this.driversService.assertAssignableDriver(driverId);

    const [updated] = await this.database.db
      .update(orders)
      // New driver hasn't accepted yet, so reset acceptance.
      .set({ driverId, acceptedAt: null, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    const result = await this.withItems(updated);
    // Notify the previously-assigned driver (if any) that it moved on.
    const previous =
      order.driverId && order.driverId !== driverId ? [order.driverId] : [];
    this.gateway.emitOrderUpdate(result, previous);
    return result;
  }

  /**
   * A driver claims an order from the available pool (a READY, unassigned
   * order). This assigns it to them and marks it accepted.
   */
  async acceptOrder(user: AuthUser, orderId: string): Promise<OrderWithItems> {
    const order = await this.getOrderOrThrow(orderId);

    if (order.status !== 'READY') {
      throw new BadRequestException('Order is not available for pickup');
    }
    if (order.driverId && order.driverId !== user.id) {
      throw new ConflictException('Order has already been taken');
    }
    if (order.driverId === user.id && order.acceptedAt) {
      return this.withItems(order); // already claimed — idempotent
    }

    const [updated] = await this.database.db
      .update(orders)
      .set({ driverId: user.id, acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    const result = await this.withItems(updated);
    this.gateway.emitOrderUpdate(result);
    // It's no longer in the pool for other drivers.
    this.gateway.emitOrderUnavailable(result.id);
    return result;
  }

  /**
   * The assigned driver declines; the order is released back to the available
   * pool (unassigned) for another driver to claim. The former driver is
   * notified, and — if still READY — the order is re-advertised to drivers.
   */
  async declineOrder(user: AuthUser, orderId: string): Promise<OrderWithItems> {
    const order = await this.getOrderOrThrow(orderId);
    this.assertAssignedDriver(user, order);

    const [updated] = await this.database.db
      .update(orders)
      .set({ driverId: null, acceptedAt: null, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    const result = await this.withItems(updated);
    this.gateway.emitOrderUpdate(result, [user.id]);
    if (result.status === 'READY') {
      this.gateway.emitOrderAvailable(result);
    }
    return result;
  }

  // ----- Live location (Redis) -----

  /**
   * Records the driver's live location for an active delivery in Redis (short
   * TTL, never Postgres). Returns the stored location, or null if the driver
   * isn't the one assigned to an OUT_FOR_DELIVERY order.
   */
  async recordDriverLocation(
    driverId: string,
    input: { orderId: string; lat: number; lng: number },
  ): Promise<DriverLocation | null> {
    const order = await this.database.db.query.orders.findFirst({
      where: and(
        eq(orders.id, input.orderId),
        eq(orders.driverId, driverId),
        eq(orders.status, 'OUT_FOR_DELIVERY'),
      ),
    });
    if (!order) return null;

    const location: DriverLocation = {
      orderId: input.orderId,
      lat: input.lat,
      lng: input.lng,
      updatedAt: new Date().toISOString(),
    };
    await this.cache.set(`order:location:${input.orderId}`, location, 120);
    return location;
  }

  /** The last-known driver location for an order the caller may view. */
  async getOrderLocation(
    user: AuthUser,
    orderId: string,
  ): Promise<DriverLocation | null> {
    await this.authorizeView(user, orderId);
    const location = await this.cache.get<DriverLocation>(
      `order:location:${orderId}`,
    );
    return location ?? null;
  }

  // ----- Analytics -----

  /** Order + revenue totals for the owner's restaurant. Revenue = paid orders. */
  async getRestaurantAnalytics(user: AuthUser): Promise<RestaurantAnalytics> {
    const restaurant = await this.restaurantsService.findMine(user.id);
    if (!restaurant) {
      return {
        totalOrders: 0,
        totalRevenue: '0.00',
        todayOrders: 0,
        todayRevenue: '0.00',
        weeklyRevenue: this.emptyWeek(),
      };
    }

    const paid = notInArray(orders.status, ['PENDING']);
    const scope = eq(orders.restaurantId, restaurant.id);
    const startOfToday = this.startOfDay(new Date());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6); // last 7 days incl. today

    const revenueCols = {
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float`,
    };

    const [[totals], [today], daily] = await Promise.all([
      this.database.db
        .select(revenueCols)
        .from(orders)
        .where(and(scope, paid)),
      this.database.db
        .select(revenueCols)
        .from(orders)
        .where(and(scope, paid, gte(orders.createdAt, startOfToday))),
      this.database.db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
          revenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::float`,
        })
        .from(orders)
        .where(and(scope, paid, gte(orders.createdAt, startOfWeek)))
        .groupBy(sql`date_trunc('day', ${orders.createdAt})`),
    ]);

    const byDay = new Map(daily.map((row) => [row.day, row.revenue]));
    const weeklyRevenue = this.lastSevenDays(startOfWeek).map((date) => ({
      date,
      revenue: (byDay.get(date) ?? 0).toFixed(2),
    }));

    return {
      totalOrders: totals.count,
      totalRevenue: totals.revenue.toFixed(2),
      todayOrders: today.count,
      todayRevenue: today.revenue.toFixed(2),
      weeklyRevenue,
    };
  }

  /** Delivery counts for the current driver. */
  async getDriverStats(user: AuthUser): Promise<DriverStats> {
    const delivered = and(
      eq(orders.driverId, user.id),
      eq(orders.status, 'DELIVERED'),
    );
    const startOfToday = this.startOfDay(new Date());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const countWhere = async (where: SQL | undefined): Promise<number> => {
      const [row] = await this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(where);
      return row?.count ?? 0;
    };

    const [totalDeliveries, todayDeliveries, weekDeliveries] =
      await Promise.all([
        countWhere(delivered),
        countWhere(and(delivered, gte(orders.createdAt, startOfToday))),
        countWhere(and(delivered, gte(orders.createdAt, startOfWeek))),
      ]);

    return { totalDeliveries, todayDeliveries, weekDeliveries };
  }

  // ----- Helpers -----

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private lastSevenDays(start: Date): string[] {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return this.dateKey(day);
    });
  }

  private emptyWeek(): { date: string; revenue: string }[] {
    const start = this.startOfDay(new Date());
    start.setDate(start.getDate() - 6);
    return this.lastSevenDays(start).map((date) => ({
      date,
      revenue: '0.00',
    }));
  }

  /**
   * Deletes any PENDING orders whose payment window has elapsed and notifies
   * the customer of each; returns the count. The `status = PENDING` guard means
   * each order is removed exactly once, so no duplicate broadcasts.
   */
  private async expireStale(): Promise<number> {
    const deleted = await this.database.db
      .delete(orders)
      .where(
        and(eq(orders.status, 'PENDING'), lt(orders.expiresAt, new Date())),
      )
      .returning();

    for (const order of deleted) {
      this.gateway.emitOrderDeleted(order);
    }

    return deleted.length;
  }

  private async loadCustomerOrder(user: AuthUser, id: string): Promise<Order> {
    const order = await this.database.db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.id) {
      throw new ForbiddenException('You cannot pay for this order');
    }
    return order;
  }

  private assertPayable(order: Order): void {
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Order is not awaiting payment');
    }
    if (order.expiresAt && order.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This order has expired');
    }
  }

  private async markConfirmed(orderId: string): Promise<OrderWithItems> {
    // No auto-assignment: drivers claim orders from the available pool once the
    // restaurant marks them READY (see acceptOrder / findAvailable).
    const [order] = await this.database.db
      .update(orders)
      .set({ status: 'CONFIRMED', expiresAt: null, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    const result = await this.withItems(order);
    this.gateway.emitOrderUpdate(result);
    return result;
  }

  private async getOrderOrThrow(id: string): Promise<Order> {
    const order = await this.database.db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Ensures the caller is the driver currently assigned to the order. */
  private assertAssignedDriver(user: AuthUser, order: Order): void {
    if (order.driverId !== user.id) {
      throw new ForbiddenException('This order is not assigned to you');
    }
    if (['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('This order can no longer be changed');
    }
  }

  /** Verifies the caller may assign a driver: the owning restaurant or an admin. */
  private async assertCanAssign(actor: AuthUser, order: Order): Promise<void> {
    if (actor.role === UserRole.ADMIN) return;

    if (actor.role === UserRole.RESTAURANT_OWNER) {
      const restaurant = await this.restaurantsService.findMine(actor.id);
      if (restaurant?.id === order.restaurantId) return;
    }

    throw new ForbiddenException('You cannot assign this order');
  }

  /** Verifies the caller is allowed to change this order's status. */
  private async assertCanUpdate(
    user: Pick<AuthUser, 'id' | 'role'>,
    order: Order,
  ): Promise<void> {
    switch (user.role) {
      case UserRole.ADMIN:
        return;
      case UserRole.RESTAURANT_OWNER: {
        const restaurant = await this.restaurantsService.findMine(user.id);
        if (restaurant?.id !== order.restaurantId) {
          throw new ForbiddenException('You cannot update this order');
        }
        return;
      }
      case UserRole.DRIVER: {
        // A driver may claim an unclaimed READY order; otherwise it must
        // already be assigned to them.
        const claimingReady =
          order.status === 'READY' &&
          (order.driverId === null || order.driverId === user.id);
        if (!claimingReady && order.driverId !== user.id) {
          throw new ForbiddenException('This order is not assigned to you');
        }
        return;
      }
      default:
        throw new ForbiddenException('You cannot update this order');
    }
  }

  private async withItems(order: Order): Promise<OrderWithItems> {
    const [items, customerName] = await Promise.all([
      this.database.db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          menuItemId: orderItems.menuItemId,
          name: menuItems.name,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          createdAt: orderItems.createdAt,
          updatedAt: orderItems.updatedAt,
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, order.id)),
      this.customerNameOf(order.customerId),
    ]);
    return { ...order, customerName, items };
  }

  /** Full name for a customer id, or null if not found. */
  private async customerNameOf(customerId: string): Promise<string | null> {
    const user = await this.database.db.query.users.findFirst({
      where: eq(users.id, customerId),
      columns: { firstName: true, lastName: true },
    });
    return user ? `${user.firstName} ${user.lastName}` : null;
  }

  /** Attaches customer names to a page of orders (batched). */
  private async attachCustomerNames(
    items: Order[],
  ): Promise<OrderWithCustomer[]> {
    if (items.length === 0) return [];
    const ids = [...new Set(items.map((o) => o.customerId))];
    const rows = await this.database.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(inArray(users.id, ids));
    const byId = new Map(
      rows.map((r) => [r.id, `${r.firstName} ${r.lastName}`]),
    );
    return items.map((o) => ({
      ...o,
      customerName: byId.get(o.customerId) ?? null,
    }));
  }

  /**
   * Builds the `where` clause restricting orders to what `user` may see, or
   * `null` when the user provably has no orders (owner with no restaurant).
   */
  private async scopeFor(user: AuthUser): Promise<SQL | null> {
    switch (user.role) {
      case UserRole.CUSTOMER:
        return eq(orders.customerId, user.id);
      case UserRole.DRIVER:
        return eq(orders.driverId, user.id);
      case UserRole.RESTAURANT_OWNER: {
        const restaurant = await this.restaurantsService.findMine(user.id);
        return restaurant ? eq(orders.restaurantId, restaurant.id) : null;
      }
      case UserRole.ADMIN:
        return sql`true`;
    }
  }

  private async assertCanView(
    user: Pick<AuthUser, 'id' | 'role'>,
    order: Order,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    const canView =
      (user.role === UserRole.CUSTOMER && order.customerId === user.id) ||
      (user.role === UserRole.DRIVER && order.driverId === user.id) ||
      (user.role === UserRole.RESTAURANT_OWNER &&
        (await this.restaurantsService.findMine(user.id))?.id ===
          order.restaurantId);

    if (!canView) {
      throw new ForbiddenException('You cannot view this order');
    }
  }
}
