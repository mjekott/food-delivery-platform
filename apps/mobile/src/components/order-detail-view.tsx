import { OrderStatus } from "@food-delivery/types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeliveryMap } from "@/components/delivery-map";
import { Button } from "@/components/ui/button";
import { useOrderUpdates } from "@/hooks/use-order-socket";
import { useDriverLocation, useOrder } from "@/hooks/use-orders";
import { useRestaurant } from "@/hooks/use-restaurants";
import { formatNaira } from "@/lib/format";

const STEPS: {
  status: OrderStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { status: OrderStatus.CONFIRMED, label: "Order Confirmed", icon: "checkmark" },
  { status: OrderStatus.PREPARING, label: "Being Prepared", icon: "restaurant" },
  { status: OrderStatus.READY, label: "Ready for Pickup", icon: "bag-check" },
  {
    status: OrderStatus.OUT_FOR_DELIVERY,
    label: "On the way",
    icon: "bicycle",
  },
  { status: OrderStatus.DELIVERED, label: "Delivered", icon: "home" },
];

function heading(status: OrderStatus): { title: string; subtitle: string } {
  switch (status) {
    case OrderStatus.PENDING:
      return { title: "Order Placed!", subtitle: "Awaiting payment" };
    case OrderStatus.DELIVERED:
      return { title: "Order Delivered!", subtitle: "This order is complete" };
    case OrderStatus.CANCELLED:
      return { title: "Order Cancelled", subtitle: "This order was cancelled" };
    default:
      return { title: "Order in progress", subtitle: "Track the order below" };
  }
}

function statusColor(status: OrderStatus): string {
  if (status === OrderStatus.PENDING) return "text-amber-600";
  if (status === OrderStatus.DELIVERED) return "text-green-600";
  if (status === OrderStatus.CANCELLED) return "text-red-500";
  return "text-blue-600";
}

/**
 * Full order view with a live status timeline. Role-agnostic — used by both the
 * customer and restaurant-owner order routes. Streams live updates so the
 * timeline advances as the restaurant/driver move the order along.
 */
export function OrderDetailView({ id }: { id: string }) {
  const { data: order, isLoading } = useOrder(id);
  const { data: driverLocation } = useDriverLocation(id);
  const { data: restaurant } = useRestaurant(order?.restaurantId ?? "");
  useOrderUpdates({ orderId: id });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#16A34A" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <BackChevron />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-black">
            Order not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { title, subtitle } = heading(order.status);
  const isCancelled = order.status === OrderStatus.CANCELLED;
  const isDelivered = order.status === OrderStatus.DELIVERED;
  const isOutForDelivery = order.status === OrderStatus.OUT_FOR_DELIVERY;
  const currentIndex = STEPS.findIndex((s) => s.status === order.status);

  const pickupCoord =
    restaurant?.latitude != null && restaurant?.longitude != null
      ? { lat: restaurant.latitude, lng: restaurant.longitude }
      : null;
  const customerCoord =
    order.deliveryLat != null && order.deliveryLng != null
      ? { lat: order.deliveryLat, lng: order.deliveryLng }
      : null;
  const driverCoord = driverLocation
    ? { lat: driverLocation.lat, lng: driverLocation.lng }
    : null;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <BackChevron />
      <ScrollView
        contentContainerClassName="px-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-extrabold text-black">{title}</Text>
        <Text className="mt-1 text-base text-gray-500">{subtitle}</Text>

        {isOutForDelivery ? (
          <View className="mt-5">
            <DeliveryMap
              driver={driverCoord}
              pickup={pickupCoord}
              customer={customerCoord}
              pickupLabel={restaurant?.name}
              customerLabel={order.customerName}
              height={220}
            />
          </View>
        ) : null}

        {/* Details */}
        <View className="mt-7 gap-4">
          <Detail
            label="Order ID"
            value={`#${order.id.slice(0, 8).toUpperCase()}`}
          />
          <Detail label="Total" value={formatNaira(order.totalAmount)} />
          <Detail label="Delivery to" value={order.deliveryAddress} />
          <View>
            <Text className="text-xs text-gray-400">Status</Text>
            <Text
              className={`mt-0.5 text-base font-bold uppercase ${statusColor(order.status)}`}
            >
              {order.status.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        {/* Items */}
        <Text className="mb-2 mt-8 text-base font-bold text-black">Items</Text>
        <View className="gap-2">
          {order.items.map((item) => (
            <View key={item.id} className="flex-row items-center">
              <Text className="text-sm font-semibold text-gray-500">
                {Number(item.quantity)}×
              </Text>
              <Text
                className="ml-2 flex-1 text-[15px] text-black"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text className="text-[15px] font-medium text-black">
                {formatNaira(
                  String(Number(item.unitPrice) * Number(item.quantity)),
                )}
              </Text>
            </View>
          ))}
        </View>

        {/* Progress */}
        <Text className="mb-5 mt-9 text-lg font-bold text-black">
          Order Progress
        </Text>

        {isCancelled ? (
          <View className="flex-row items-center rounded-2xl bg-red-50 p-4">
            <Ionicons name="close-circle" size={22} color="#EF4444" />
            <Text className="ml-2 text-base font-semibold text-red-600">
              This order was cancelled
            </Text>
          </View>
        ) : (
          <View>
            {STEPS.map((step, index) => {
              // Once delivered every step is complete (full green), not "active".
              const done = isDelivered || index < currentIndex;
              const active = !isDelivered && index === currentIndex;
              const isLast = index === STEPS.length - 1;
              return (
                <View key={step.status} className="flex-row">
                  {/* Icon rail */}
                  <View className="items-center">
                    {done ? (
                      <View className="h-9 w-9 items-center justify-center rounded-xl bg-green-500">
                        <Ionicons name="checkmark" size={20} color="#ffffff" />
                      </View>
                    ) : active ? (
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-orange-500">
                        <Ionicons name={step.icon} size={18} color="#ffffff" />
                      </View>
                    ) : (
                      <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-gray-200 bg-white">
                        <View className="h-2 w-2 rounded-full bg-gray-300" />
                      </View>
                    )}
                    {!isLast ? (
                      <View
                        className={`my-1 w-0.5 flex-1 ${
                          done ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    ) : null}
                  </View>

                  {/* Label */}
                  <View
                    className={`ml-4 flex-1 ${isLast ? "pt-1.5" : "pb-9 pt-1.5"}`}
                  >
                    <Text
                      className={`text-base font-semibold ${
                        done || active ? "text-black" : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Button
          label="Back to Orders"
          variant="outline"
          className="mt-6"
          onPress={() => router.back()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs text-gray-400">{label}</Text>
      <Text className="mt-0.5 text-base font-semibold text-black">{value}</Text>
    </View>
  );
}

function BackChevron() {
  return (
    <View className="px-4 pb-1 pt-1">
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
      >
        <Ionicons name="chevron-back" size={22} color="#111827" />
      </Pressable>
    </View>
  );
}
