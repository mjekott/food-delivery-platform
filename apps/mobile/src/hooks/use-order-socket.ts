import type {
  DriverLocation,
  Order,
  OrderWithItems,
} from "@food-delivery/types";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { io, type Socket } from "socket.io-client";

import { ordersKeys } from "@/hooks/use-orders";
import { getToken } from "@/lib/auth";

// Socket.IO connects to the server origin (not under the `/api` REST prefix).
const SOCKET_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(
  /\/api\/?$/,
  "",
);

const ORDER_UPDATED = "order:updated";
const ORDER_DELETED = "order:deleted";
const ORDER_DRIVER_LOCATION = "order:driver-location";
const ORDER_SUBSCRIBE = "order:subscribe";
const ORDER_UNSUBSCRIBE = "order:unsubscribe";

/** Merges a pushed order update into the list + detail query caches. */
function applyOrderUpdate(queryClient: QueryClient, order: OrderWithItems) {
  queryClient.setQueryData<Order[]>(ordersKeys.all, (list) => {
    if (!list) return list;
    const index = list.findIndex((o) => o.id === order.id);
    if (index === -1) return [order, ...list];
    const next = [...list];
    next[index] = order;
    return next;
  });
  queryClient.setQueryData([...ordersKeys.all, order.id], order);
  void queryClient.invalidateQueries({ queryKey: ["analytics"] });
}

/** Drops a deleted (cancelled/expired) order from the caches. */
function applyOrderDeleted(queryClient: QueryClient, orderId: string) {
  queryClient.setQueryData<Order[]>(ordersKeys.all, (list) =>
    list ? list.filter((o) => o.id !== orderId) : list,
  );
  queryClient.removeQueries({ queryKey: [...ordersKeys.all, orderId] });
  void queryClient.invalidateQueries({ queryKey: ["analytics"] });
}

/**
 * Subscribes to real-time order updates over Socket.IO and keeps the React
 * Query caches in sync. Restaurant owners auto-join their restaurant's room on
 * connect. Customers/drivers must subscribe per order, so pass `orderId` (a
 * detail screen) or `orderIds` (a list) to watch those orders' `order:updated`
 * events.
 */
export function useOrderUpdates(options?: {
  orderId?: string;
  orderIds?: string[];
}) {
  const queryClient = useQueryClient();

  const idsKey = useMemo(() => {
    const set = new Set<string>();
    if (options?.orderId) set.add(options.orderId);
    for (const id of options?.orderIds ?? []) set.add(id);
    return [...set].sort().join(",");
  }, [options?.orderId, options?.orderIds]);

  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;
    const ids = idsKey ? idsKey.split(",") : [];

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = io(`${SOCKET_ORIGIN}/orders`, {
        auth: { token },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.on(ORDER_UPDATED, (order: OrderWithItems) => {
        applyOrderUpdate(queryClient, order);
      });
      socket.on(ORDER_DELETED, ({ orderId }: { orderId: string }) => {
        applyOrderDeleted(queryClient, orderId);
      });
      socket.on(ORDER_DRIVER_LOCATION, (loc: DriverLocation) => {
        queryClient.setQueryData(["order-location", loc.orderId], loc);
      });

      if (ids.length > 0) {
        const subscribe = () => {
          for (const id of ids) socket?.emit(ORDER_SUBSCRIBE, id);
        };
        socket.on("connect", subscribe);
        if (socket.connected) subscribe();
      }

      // Connect only now that we're mounted; the cleanup below disconnects on
      // unmount, so the socket is live only while this screen is on-screen.
      socket.connect();
    })();

    return () => {
      cancelled = true;
      if (socket) {
        for (const id of ids) socket.emit(ORDER_UNSUBSCRIBE, id);
        socket.disconnect();
      }
    };
  }, [queryClient, idsKey]);
}
