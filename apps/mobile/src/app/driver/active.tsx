import type { Order } from "@food-delivery/types";
import { OrderStatus } from "@food-delivery/types";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { DeliveryMap } from "@/components/delivery-map";
import { Button } from "@/components/ui/button";
import { useDriverLocationBroadcast } from "@/hooks/use-driver-location";
import { useDriverSocket } from "@/hooks/use-driver-socket";
import {
  useActiveDeliveries,
  useDeclineOrder,
  useDeliverOrder,
  usePickupOrder,
} from "@/hooks/use-driver";
import { useRestaurant } from "@/hooks/use-restaurants";
import { formatNaira } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDriverStore } from "@/store/driver";

function coordOf(lat: number | null, lng: number | null) {
  return lat != null && lng != null ? { lat, lng } : null;
}

function DeliveryCard({
  order,
  onPickup,
  onDeliver,
  onDecline,
  busy,
}: {
  order: Order;
  onPickup: (order: Order) => void;
  onDeliver: (order: Order) => void;
  onDecline: (order: Order) => void;
  busy: boolean;
}) {
  const readyToPickup = order.status === OrderStatus.READY;
  const outForDelivery = order.status === OrderStatus.OUT_FOR_DELIVERY;

  return (
    <View className="rounded-2xl border border-gray-100 p-4">
      <View className="flex-row items-center justify-between">
        <View
          className={`rounded-full px-3 py-1 ${
            outForDelivery ? "bg-blue-50" : "bg-amber-50"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              outForDelivery ? "text-blue-700" : "text-amber-700"
            }`}
          >
            {outForDelivery ? "Out for delivery" : "Ready to pick up"}
          </Text>
        </View>
        <Text className="text-base font-bold text-black">
          {formatNaira(order.totalAmount)}
        </Text>
      </View>

      <View className="mt-3 flex-row items-start">
        <Ionicons name="location-outline" size={16} color="#9CA3AF" />
        <Text className="ml-1 flex-1 text-sm text-gray-600">
          {order.deliveryAddress}
        </Text>
      </View>

      {readyToPickup ? (
        <View className="mt-3 flex-row gap-3">
          <Button
            label="Decline"
            variant="outline"
            size="sm"
            className="flex-1"
            onPress={() => onDecline(order)}
          />
          <Button
            label="Start delivery"
            size="sm"
            className="flex-1"
            loading={busy}
            onPress={() => onPickup(order)}
          />
        </View>
      ) : outForDelivery ? (
        <Button
          label="Mark as delivered"
          size="sm"
          className="mt-3"
          loading={busy}
          onPress={() => onDeliver(order)}
        />
      ) : null}
    </View>
  );
}

export default function DriverActiveScreen() {
  const isOnline = useDriverStore((s) => s.isOnline);
  const { height: screenHeight } = useWindowDimensions();
  const {
    data: deliveries,
    isLoading,
    isRefetching,
    refetch,
  } = useActiveDeliveries();
  const pickup = usePickupOrder();
  const deliver = useDeliverOrder();
  const decline = useDeclineOrder();

  useDriverSocket(isOnline);

  // The delivery the map focuses on: out-for-delivery first, else ready/accepted.
  const list = deliveries ?? [];
  const current =
    list.find((o) => o.status === OrderStatus.OUT_FOR_DELIVERY) ??
    list.find((o) => o.status === OrderStatus.READY) ??
    list[0];

  const { location, permissionDenied } = useDriverLocationBroadcast(current);
  const { data: restaurant } = useRestaurant(current?.restaurantId ?? "");
  const pickupCoord = coordOf(
    restaurant?.latitude ?? null,
    restaurant?.longitude ?? null,
  );
  const customerCoord = current
    ? coordOf(current.deliveryLat, current.deliveryLng)
    : null;

  const onPickup = (order: Order) =>
    pickup.mutate(order.id, {
      onSuccess: () => toast.success("On your way!"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  const onDeliver = (order: Order) =>
    deliver.mutate(order.id, {
      onSuccess: () => toast.success("Delivery completed"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  const onDecline = (order: Order) =>
    decline.mutate(order.id, {
      onSuccess: () => toast("Delivery released"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  const busyId =
    (pickup.isPending && pickup.variables) ||
    (deliver.isPending && deliver.variables) ||
    undefined;

  // Where the driver is heading now: the customer once out for delivery,
  // otherwise the restaurant to pick up.
  const navTarget =
    current?.status === OrderStatus.OUT_FOR_DELIVERY
      ? customerCoord
      : pickupCoord;
  const openDirections = () => {
    if (!navTarget) return;
    void Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${navTarget.lat},${navTarget.lng}`,
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pb-3 pt-2">
        <Text className="text-3xl font-bold text-black">Active</Text>
      </View>

      {/* Big, interactive map fixed above the list so pan/zoom don't fight scroll */}
      {current ? (
        <View className="px-6 pb-3">
          <View className="relative">
            <DeliveryMap
              driver={location}
              pickup={pickupCoord}
              customer={customerCoord}
              pickupLabel={restaurant?.name}
              customerLabel={current.customerName}
              height={Math.round(screenHeight * 0.7)}
              followDriver={false}
            />

            {/* Primary step action, floating top-right over the map */}
            {current.status === OrderStatus.OUT_FOR_DELIVERY ? (
              <View className="absolute right-3 top-3">
                <Button
                  label="Mark delivered"
                  size="sm"
                  loading={busyId === current.id}
                  onPress={() => onDeliver(current)}
                />
              </View>
            ) : current.status === OrderStatus.READY ? (
              <View className="absolute right-3 top-3">
                <Button
                  label="Start delivery"
                  size="sm"
                  loading={busyId === current.id}
                  onPress={() => onPickup(current)}
                />
              </View>
            ) : null}

            {/* Open turn-by-turn directions to the current target */}
            {navTarget ? (
              <Pressable
                onPress={openDirections}
                className="absolute bottom-3 right-3 h-12 w-12 items-center justify-center rounded-full bg-black"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Ionicons name="navigate" size={20} color="#ffffff" />
              </Pressable>
            ) : null}
          </View>

          {permissionDenied ? (
            <Text className="mt-2 text-xs text-amber-600">
              Enable location access to share your position with the customer.
            </Text>
          ) : null}
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={deliveries ?? []}
          keyExtractor={(o) => o.id}
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
              <Text className="mt-3 text-base font-medium text-gray-500">
                No active deliveries
              </Text>
              <Text className="mt-1 text-center text-gray-400">
                Accept a delivery from the Home tab to get started.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <DeliveryCard
              order={item}
              onPickup={onPickup}
              onDeliver={onDeliver}
              onDecline={onDecline}
              busy={busyId === item.id}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
