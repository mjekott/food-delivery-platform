export enum UserRole {
  CUSTOMER = "CUSTOMER",
  RESTAURANT_OWNER = "RESTAURANT_OWNER",
  DRIVER = "DRIVER",
  ADMIN = "ADMIN",
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  pushToken: string | null;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: Date;
  database: "up" | "down";
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isOpen: string;
  rating: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY = "READY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export interface Order {
  id: string;
  customerId: string;
  /** Customer's full name (joined on read). */
  customerName: string | null;
  restaurantId: string;
  driverId: string | null;
  acceptedAt: string | null;
  status: OrderStatus;
  totalAmount: string;
  deliveryAddress: string;
  /** Customer delivery coordinates (Google Places) for the map destination. */
  deliveryLat: number | null;
  deliveryLng: number | null;
  /** Payment gateway used (e.g. "paystack") and its transaction reference. */
  paymentProvider: string | null;
  paymentReference: string | null;
  /** ISO string; when an unpaid order stops being payable. Null once paid. */
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response of initializing a Paystack payment for an order. */
export interface PaymentInit {
  authorizationUrl: string;
  reference: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  /** Menu item name at time of order (joined in order-detail responses). */
  name: string;
  quantity: string;
  unitPrice: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface DriverStatus {
  isOnline: boolean;
}

/** A driver's live location for an active delivery (stored in Redis). */
export interface DriverLocation {
  orderId: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

export interface RestaurantAnalytics {
  totalOrders: number;
  totalRevenue: string;
  todayOrders: number;
  todayRevenue: string;
  /** Last 7 days, oldest → newest. */
  weeklyRevenue: { date: string; revenue: string }[];
}

export interface DriverStats {
  totalDeliveries: number;
  todayDeliveries: number;
  weekDeliveries: number;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  driverId: string | null;
  restaurantRating: number;
  driverRating: number | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}
