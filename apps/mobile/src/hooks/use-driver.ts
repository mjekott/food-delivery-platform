import type {
  ApiResponse,
  DriverStats,
  DriverStatus,
  Order,
  OrderWithItems,
  PaginatedResult,
} from "@food-delivery/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";

export const driverKeys = {
  available: ["orders", "available"] as const,
  active: ["orders", "driver", "active"] as const,
  history: ["orders", "driver", "history"] as const,
  stats: ["analytics", "driver"] as const,
  status: ["driver", "status"] as const,
};

/** The driver's current online/offline status from the server. */
export function useDriverStatus() {
  return useQuery({
    queryKey: driverKeys.status,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DriverStatus>>(
        "/drivers/me/status",
      );
      return data.data;
    },
  });
}

/** Sets the driver online/offline. */
export function useSetAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isOnline: boolean) => {
      const { data } = await api.patch<ApiResponse<DriverStatus>>(
        "/drivers/me/status",
        { isOnline },
      );
      return data.data;
    },
    onSuccess: (status) => {
      queryClient.setQueryData(driverKeys.status, status);
    },
  });
}

/** The pool of orders a driver can claim (READY + unassigned). Online-only. */
export function useAvailableOrders(enabled: boolean) {
  return useQuery({
    queryKey: driverKeys.available,
    enabled,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<Order>>>(
        "/orders/available",
        { params: { limit: 50 } },
      );
      return data.data.items;
    },
  });
}

/** The driver's assigned, in-progress deliveries. */
export function useActiveDeliveries() {
  return useQuery({
    queryKey: driverKeys.active,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<Order>>>(
        "/orders",
        { params: { active: true, limit: 50 } },
      );
      return data.data.items;
    },
  });
}

/** The driver's completed deliveries (history). */
export function useDeliveryHistory() {
  return useQuery({
    queryKey: driverKeys.history,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<Order>>>(
        "/orders",
        { params: { status: "DELIVERED", limit: 50 } },
      );
      return data.data.items;
    },
  });
}

/** Delivery counts (total / today / this week) for the current driver. */
export function useDriverStats() {
  return useQuery({
    queryKey: driverKeys.stats,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DriverStats>>(
        "/orders/driver-stats",
      );
      return data.data;
    },
  });
}

/** Shared factory for the driver's POST order actions. */
function useDriverAction(path: (id: string) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.post<ApiResponse<OrderWithItems>>(
        path(orderId),
        {},
      );
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: driverKeys.available });
      void queryClient.invalidateQueries({ queryKey: driverKeys.active });
    },
  });
}

/** Claims a READY order from the available pool. */
export const useAcceptOrder = () =>
  useDriverAction((id) => `/orders/${id}/accept`);

/** Releases an accepted order back to the pool. */
export const useDeclineOrder = () =>
  useDriverAction((id) => `/orders/${id}/decline`);

/** Marks an accepted order picked up (out for delivery). */
export const usePickupOrder = () =>
  useDriverAction((id) => `/orders/${id}/pickup`);

/** Marks an out-for-delivery order delivered. */
export const useDeliverOrder = () =>
  useDriverAction((id) => `/orders/${id}/deliver`);
