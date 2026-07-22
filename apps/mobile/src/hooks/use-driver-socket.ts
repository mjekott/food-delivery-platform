import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

import { driverKeys } from "@/hooks/use-driver";
import { getToken } from "@/lib/auth";

const SOCKET_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(
  /\/api\/?$/,
  "",
);

/**
 * Live driver updates over Socket.IO. Drivers auto-join the pool + their own
 * room on connect. Refreshes the available-pool and active-delivery queries as
 * orders are advertised (`order:available`), claimed (`order:unavailable`), or
 * change status (`order:updated`). Connects only while `enabled` (online).
 */
export function useDriverSocket(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let socket: Socket | undefined;
    let cancelled = false;

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = io(`${SOCKET_ORIGIN}/orders`, {
        auth: { token },
        transports: ["websocket"],
        autoConnect: false,
      });

      const refreshAvailable = () =>
        queryClient.invalidateQueries({ queryKey: driverKeys.available });
      const refreshActive = () =>
        queryClient.invalidateQueries({ queryKey: driverKeys.active });
      const refreshStats = () =>
        queryClient.invalidateQueries({ queryKey: ["analytics"] });

      socket.on("order:available", refreshAvailable);
      socket.on("order:unavailable", refreshAvailable);
      socket.on("order:deleted", refreshAvailable);
      socket.on("order:updated", () => {
        refreshActive();
        refreshAvailable();
        refreshStats();
      });

      socket.connect();
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [queryClient, enabled]);
}
