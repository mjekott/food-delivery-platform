import type { AuthUser, JwtPayload } from '@food-delivery/types';
import { UserRole } from '@food-delivery/types';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { OrdersService, type OrderWithItems } from './orders.service';

/** Event emitted to interested parties whenever an order changes. */
export const ORDER_UPDATED_EVENT = 'order:updated';
/** An order entered the pool drivers can claim (READY + unassigned). */
export const ORDER_AVAILABLE_EVENT = 'order:available';
/** An order left the pool (claimed or no longer READY). */
export const ORDER_UNAVAILABLE_EVENT = 'order:unavailable';
/** An order was removed from the system (cancelled/expired). */
export const ORDER_DELETED_EVENT = 'order:deleted';
/** Client → server: a driver pushing its live GPS for an active delivery. */
export const DRIVER_LOCATION_EVENT = 'driver:location';
/** Server → order room: the driver's latest location. */
export const ORDER_DRIVER_LOCATION_EVENT = 'order:driver-location';
/** Message a client sends to (un)subscribe to a specific order's updates. */
export const ORDER_SUBSCRIBE_EVENT = 'order:subscribe';
export const ORDER_UNSUBSCRIBE_EVENT = 'order:unsubscribe';
/** Shared room every online driver joins; carries the available-order pool. */
export const DRIVERS_POOL_ROOM = 'drivers';

/**
 * Real-time order updates over Socket.IO. Clients connect to the `/orders`
 * namespace with their JWT (`auth: { token }` or an `Authorization` header) and
 * receive updates via rooms:
 * - `restaurant:<id>` → the owner auto-joins on connect and receives every
 *   order for their restaurant.
 * - `order:<id>`      → customers and drivers subscribe to the specific orders
 *   they are viewing (after an authorization check).
 */
@WebSocketGateway({ namespace: 'orders', cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayConnection {
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly restaurantsService: RestaurantsService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(
        this.extractToken(client),
        { secret: this.configService.getOrThrow<string>('JWT_SECRET') },
      );

      this.socketData(client).user = {
        id: payload.sub,
        role: payload.role,
      };

      // Customers get a personal room so every order they placed streams
      // updates without subscribing to each one individually.
      if (payload.role === UserRole.CUSTOMER) {
        await client.join(`customer:${payload.sub}`);
      }

      if (payload.role === UserRole.RESTAURANT_OWNER) {
        const restaurant = await this.restaurantsService.findMine(payload.sub);
        if (restaurant) await client.join(`restaurant:${restaurant.id}`);
      }

      // Drivers get their own assignment room plus the shared pool of
      // available orders they can claim.
      if (payload.role === UserRole.DRIVER) {
        await client.join(`driver:${payload.sub}`);
        await client.join(DRIVERS_POOL_ROOM);
      }
    } catch {
      client.disconnect();
    }
  }

  /** Joins the client to an order's room once it's confirmed they may view it. */
  @SubscribeMessage(ORDER_SUBSCRIBE_EVENT)
  async subscribeToOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() orderId: string,
  ): Promise<{ ok: boolean }> {
    const user = this.socketData(client).user;
    if (!user) return { ok: false };

    try {
      await this.ordersService.authorizeView(user, orderId);
      await client.join(`order:${orderId}`);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage(ORDER_UNSUBSCRIBE_EVENT)
  async unsubscribeFromOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() orderId: string,
  ): Promise<{ ok: boolean }> {
    await client.leave(`order:${orderId}`);
    return { ok: true };
  }

  /** A driver pushes its live GPS for an active delivery (every ~10s). */
  @SubscribeMessage(DRIVER_LOCATION_EVENT)
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId: string; lat: number; lng: number },
  ): Promise<{ ok: boolean }> {
    const user = this.socketData(client).user;
    if (!user || user.role !== UserRole.DRIVER) return { ok: false };

    const location = await this.ordersService.recordDriverLocation(
      user.id,
      body,
    );
    if (!location) return { ok: false };

    this.server
      .to(`order:${body.orderId}`)
      .emit(ORDER_DRIVER_LOCATION_EVENT, location);
    return { ok: true };
  }

  /**
   * Broadcasts an order change to its order room, restaurant, and current
   * driver. `alsoNotifyDriverIds` reaches drivers no longer on the order (e.g.
   * one who just declined or was replaced) so their apps can drop it.
   */
  emitOrderUpdate(
    order: OrderWithItems,
    alsoNotifyDriverIds: string[] = [],
  ): void {
    const rooms = new Set([
      `order:${order.id}`,
      `restaurant:${order.restaurantId}`,
      `customer:${order.customerId}`,
    ]);
    if (order.driverId) rooms.add(`driver:${order.driverId}`);
    for (const id of alsoNotifyDriverIds) rooms.add(`driver:${id}`);

    this.server.to([...rooms]).emit(ORDER_UPDATED_EVENT, order);
    this.logger.debug(`Emitted ${ORDER_UPDATED_EVENT} for order ${order.id}`);
  }

  /** Advertises a newly-available order to all online drivers. */
  emitOrderAvailable(order: OrderWithItems): void {
    this.server.to(DRIVERS_POOL_ROOM).emit(ORDER_AVAILABLE_EVENT, order);
  }

  /** Tells every interested party an order was deleted so lists can drop it. */
  emitOrderDeleted(order: {
    id: string;
    restaurantId: string;
    customerId: string;
    driverId: string | null;
  }): void {
    const rooms = new Set([
      `order:${order.id}`,
      `restaurant:${order.restaurantId}`,
      `customer:${order.customerId}`,
      DRIVERS_POOL_ROOM,
    ]);
    if (order.driverId) rooms.add(`driver:${order.driverId}`);
    this.server.to([...rooms]).emit(ORDER_DELETED_EVENT, { orderId: order.id });
    this.logger.debug(`Emitted ${ORDER_DELETED_EVENT} for order ${order.id}`);
  }

  /** Tells drivers an order left the pool so their lists can drop it. */
  emitOrderUnavailable(orderId: string): void {
    this.server.to(DRIVERS_POOL_ROOM).emit(ORDER_UNAVAILABLE_EVENT, { orderId });
  }

  private socketData(client: Socket): {
    user?: Pick<AuthUser, 'id' | 'role'>;
  } {
    return client.data as { user?: Pick<AuthUser, 'id' | 'role'> };
  }

  private extractToken(client: Socket): string {
    const { token } = client.handshake.auth as { token?: string };
    if (token) return token;

    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);

    throw new Error('Missing authentication token');
  }
}
