import type {
  ApiResponse,
  DriverLocation,
  Order,
  OrderStatus,
  OrderWithItems,
  PaginatedResult,
  PaymentInit,
} from "@food-delivery/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";

function patchOrderCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  order: OrderWithItems,
) {
  queryClient.setQueryData<Order[]>(ordersKeys.all, (list) =>
    list ? list.map((o) => (o.id === order.id ? order : o)) : list,
  );
  queryClient.setQueryData([...ordersKeys.all, order.id], order);
}

export const ordersKeys = {
  all: ["orders"] as const,
};

export interface CreateOrderInput {
  restaurantId: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  items: { menuItemId: string; quantity: number }[];
}

export function useOrders() {
  return useQuery({
    queryKey: ordersKeys.all,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<Order>>>(
        "/orders",
        { params: { limit: 50 } },
      );
      return data.data.items;
    },
  });
}

/** Live driver location for an order (seeded from Redis; updated via socket). */
export function useDriverLocation(orderId: string) {
  return useQuery({
    queryKey: ["order-location", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DriverLocation | null>>(
        `/orders/${orderId}/location`,
      );
      return data.data;
    },
  });
}

/** A single order with its line items. */
export function useOrder(id: string) {
  return useQuery({
    queryKey: [...ordersKeys.all, id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<OrderWithItems>>(
        `/orders/${id}`,
      );
      return data.data;
    },
  });
}

/** Advances an order's status (restaurant owner / driver). */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      const { data } = await api.patch<ApiResponse<OrderWithItems>>(
        `/orders/${orderId}/status`,
        { status },
      );
      return data.data;
    },
    onSuccess: (order) => patchOrderCaches(queryClient, order),
  });
}

/** Cancels an unpaid order (customer, before payment). */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      // Cancelled orders are deleted server-side; the deleted row is returned.
      const { data } = await api.post<ApiResponse<Order>>(
        `/orders/${orderId}/cancel`,
        {},
      );
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersKeys.all });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const { data } = await api.post<ApiResponse<OrderWithItems>>(
        "/orders",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersKeys.all });
    },
  });
}

/** Initializes a Paystack payment and returns the checkout URL. */
export function useInitializePayment() {
  return useMutation({
    mutationFn: async ({
      orderId,
      callbackUrl,
    }: {
      orderId: string;
      callbackUrl?: string;
    }) => {
      const { data } = await api.post<ApiResponse<PaymentInit>>(
        `/orders/${orderId}/pay`,
        { callbackUrl },
      );
      return data.data;
    },
  });
}

/** Verifies payment; on success the order advances to CONFIRMED (ongoing). */
export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.post<ApiResponse<OrderWithItems>>(
        `/orders/${orderId}/verify`,
        {},
      );
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ordersKeys.all });
    },
  });
}
