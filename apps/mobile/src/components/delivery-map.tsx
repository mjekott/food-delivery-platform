import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

interface Coord {
  lat: number;
  lng: number;
}

/** A circular icon map marker. The name shows in the marker's tap callout. */
function MarkerBadge({
  icon,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View
      style={{ backgroundColor: color }}
      className="h-9 w-9 items-center justify-center rounded-full border-2 border-white"
    >
      <Ionicons name={icon} size={18} color="#ffffff" />
    </View>
  );
}

interface DeliveryMapProps {
  driver?: Coord | null;
  pickup?: Coord | null;
  customer?: Coord | null;
  pickupLabel?: string | null;
  customerLabel?: string | null;
  height?: number;
  /**
   * true  → camera re-centers on the driver on every update (watch mode).
   * false → centers on the driver once (first fix), then the user pans/zooms.
   */
  followDriver?: boolean;
}

/** Map of a delivery: pickup (restaurant), destination (customer), live driver. */
export function DeliveryMap({
  driver,
  pickup,
  customer,
  pickupLabel,
  customerLabel,
  height = 220,
  followDriver = true,
}: DeliveryMapProps) {
  const mapRef = useRef<MapView>(null);
  const hasCentered = useRef(false);
  const center = driver ?? customer ?? pickup;

  // Follow the driver (always in watch mode, or once otherwise).
  const driverLat = driver?.lat;
  const driverLng = driver?.lng;
  useEffect(() => {
    if (driverLat == null || driverLng == null) return;
    if (!followDriver && hasCentered.current) return;
    mapRef.current?.animateCamera(
      { center: { latitude: driverLat, longitude: driverLng } },
      { duration: 500 },
    );
    hasCentered.current = true;
  }, [driverLat, driverLng, followDriver]);

  if (!center) {
    return (
      <View
        style={{ height }}
        className="items-center justify-center rounded-2xl bg-gray-100"
      >
        <Text className="text-sm text-gray-400">Waiting for location…</Text>
      </View>
    );
  }

  const region: Region = {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  return (
    <View style={{ height }} className="overflow-hidden rounded-2xl">
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={region}>
        {pickup ? (
          <Marker
            coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
            title={pickupLabel ?? "Pickup"}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <MarkerBadge icon="restaurant" color="#EA580C" />
          </Marker>
        ) : null}
        {customer ? (
          <Marker
            coordinate={{ latitude: customer.lat, longitude: customer.lng }}
            title={customerLabel ?? "Delivery"}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <MarkerBadge icon="home" color="#2563EB" />
          </Marker>
        ) : null}
        {driver ? (
          <Marker
            coordinate={{ latitude: driver.lat, longitude: driver.lng }}
            title="Driver"
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <MarkerBadge icon="bicycle" color="#16A34A" />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}
