import type { Order } from "@food-delivery/types";
import { OrderStatus } from "@food-delivery/types";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { getToken } from "@/lib/auth";

const SOCKET_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(
  /\/api\/?$/,
  "",
);

interface Coord {
  lat: number;
  lng: number;
}

/**
 * Watches the driver's location for the current delivery (for the on-screen
 * map) and, while OUT_FOR_DELIVERY, emits it over the `/orders` socket every 10s.
 */
export function useDriverLocationBroadcast(order: Order | undefined): {
  location: Coord | null;
  permissionDenied: boolean;
} {
  const [location, setLocation] = useState<Coord | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const locationRef = useRef<Coord | null>(null);

  const orderId = order?.id;
  const isDelivering = order?.status === OrderStatus.OUT_FOR_DELIVERY;

  // Watch position while there is an active delivery.
  useEffect(() => {
    if (!orderId) {
      setLocation(null);
      locationRef.current = null;
      return;
    }

    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!cancelled) setPermissionDenied(true);
        return;
      }
      if (cancelled) return;
      setPermissionDenied(false);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (position) => {
          const coord = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          locationRef.current = coord;
          setLocation(coord);
        },
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [orderId]);

  // Broadcast every 10s while out for delivery.
  useEffect(() => {
    if (!orderId || !isDelivering) return;

    let socket: Socket | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = io(`${SOCKET_ORIGIN}/orders`, {
        auth: { token },
        transports: ["websocket"],
        autoConnect: false,
      });
      socket.connect();

      interval = setInterval(() => {
        const coord = locationRef.current;
        if (coord) {
          socket?.emit("driver:location", {
            orderId,
            lat: coord.lat,
            lng: coord.lng,
          });
        }
      }, 10000);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      socket?.disconnect();
    };
  }, [orderId, isDelivering]);

  return { location, permissionDenied };
}
