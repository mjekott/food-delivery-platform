import type { Order } from "@food-delivery/types";
import { OrderStatus } from "@food-delivery/types";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { useOrderUpdates } from "@/hooks/use-order-socket";
import { useOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { useMyRestaurant, useUpdateRestaurant } from "@/hooks/use-restaurant";
import { formatNaira } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { posthog } from "@/lib/posthog";

type Tab = "active" | "completed";

const ACTIVE_STATUSES = new Set<OrderStatus>([
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
]);

// The one status the owner can advance an order to from its current status.
const OWNER_NEXT: Partial<
  Record<OrderStatus, { label: string; next: OrderStatus }>
> = {
  [OrderStatus.CONFIRMED]: {
    label: "Start Preparing",
    next: OrderStatus.PREPARING,
  },
  [OrderStatus.PREPARING]: { label: "Mark Ready", next: OrderStatus.READY },
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Awaiting payment",
  [OrderStatus.CONFIRMED]: "New order",
  [OrderStatus.PREPARING]: "Preparing",
  [OrderStatus.READY]: "Ready · awaiting driver",
  [OrderStatus.OUT_FOR_DELIVERY]: "Out for delivery",
  [OrderStatus.DELIVERED]: "Delivered",
  [OrderStatus.CANCELLED]: "Cancelled",
};

function statusTone(status: OrderStatus) {
  if (status === OrderStatus.CONFIRMED) return "bg-amber-50 text-amber-700";
  if (status === OrderStatus.READY || status === OrderStatus.DELIVERED)
    return "bg-green-50 text-green-700";
  if (status === OrderStatus.CANCELLED) return "bg-gray-100 text-gray-500";
  return "bg-blue-50 text-blue-700";
}

function OrderCard({
  order,
  onOpen,
  onAdvance,
  updating,
}: {
  order: Order;
  onOpen: (order: Order) => void;
  onAdvance: (order: Order, next: OrderStatus) => void;
  updating: boolean;
}) {
  const [badgeBg, badgeText] = statusTone(order.status).split(" ");
  const action = OWNER_NEXT[order.status];

  return (
    <Pressable
      onPress={() => onOpen(order)}
      className="rounded-2xl border border-gray-100 p-4"
    >
      <View className="flex-row items-center justify-between">
        <View className={`rounded-full px-3 py-1 ${badgeBg}`}>
          <Text className={`text-xs font-semibold ${badgeText}`}>
            {STATUS_LABEL[order.status]}
          </Text>
        </View>
        <Text className="text-base font-bold text-black">
          {formatNaira(order.totalAmount)}
        </Text>
      </View>

      <Text className="mt-3 text-xs text-gray-400">
        #{order.id.slice(0, 8).toUpperCase()} ·{" "}
        {new Date(order.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
      <Text className="mt-1 text-sm text-gray-600" numberOfLines={1}>
        {order.deliveryAddress}
      </Text>

      {action ? (
        <Button
          label={action.label}
          size="sm"
          className="mt-3"
          loading={updating}
          onPress={() => onAdvance(order, action.next)}
        />
      ) : order.status === OrderStatus.READY ? (
        <Text className="mt-3 text-sm font-medium text-gray-400">
          Waiting for a driver to pick up
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function RestaurantOrdersScreen() {
  const { data: restaurant } = useMyRestaurant();
  const updateRestaurant = useUpdateRestaurant();
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const [tab, setTab] = useState<Tab>("active");

  // Live updates: the owner auto-joins their restaurant room on connect.
  useOrderUpdates();

  const isOpen = restaurant?.isOpen === "true";

  const visible = useMemo(() => {
    const list = orders ?? [];
    return tab === "active"
      ? list.filter((o) => ACTIVE_STATUSES.has(o.status))
      : list.filter(
          (o) =>
            o.status === OrderStatus.DELIVERED ||
            o.status === OrderStatus.CANCELLED,
        );
  }, [orders, tab]);

  const onToggleOpen = (next: boolean) => {
    if (!restaurant) return;
    updateRestaurant.mutate(
      { id: restaurant.id, input: { isOpen: next } },
      {
        onSuccess: () =>
          posthog.capture("restaurant_status_toggled", {
            restaurant_id: restaurant.id,
            is_open: next,
          }),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const advance = (order: Order, next: OrderStatus) => {
    updateStatus.mutate(
      { orderId: order.id, status: next },
      {
        onSuccess: () => toast.success("Order updated"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const openOrder = (order: Order) =>
    router.push(`/restaurant/order/${order.id}` as Href);

  const header = (
    <View>
      <Text className="text-2xl font-bold text-black">
        {restaurant?.name ?? "Orders"}
      </Text>
      {restaurant?.address ? (
        <Text className="mt-1 text-gray-500">{restaurant.address}</Text>
      ) : null}

      <View className="mt-6 flex-row items-center justify-between rounded-2xl border border-gray-200 px-4 py-4">
        <View className="flex-1 pr-4">
          <Text className="text-base font-medium text-black">
            {isOpen ? "Open" : "Closed"}
          </Text>
          <Text className="mt-0.5 text-sm text-gray-500">
            {isOpen
              ? "Accepting orders from customers."
              : "Not accepting orders right now."}
          </Text>
        </View>
        <Switch
          value={isOpen}
          onValueChange={onToggleOpen}
          disabled={!restaurant || updateRestaurant.isPending}
          trackColor={{ true: "#16A34A" }}
        />
      </View>

      <Button
        label="Edit restaurant"
        variant="outline"
        onPress={() => router.push("/restaurant/edit")}
        className="mt-5"
      />

      {/* Active / Completed tabs */}
      <View className="mb-4 mt-8 flex-row rounded-full bg-gray-100 p-1">
        {(["active", "completed"] as Tab[]).map((t) => {
          const selected = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 items-center rounded-full py-2 ${
                selected ? "bg-white" : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold capitalize ${
                  selected ? "text-black" : "text-gray-500"
                }`}
              >
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={visible}
        keyExtractor={(o) => o.id}
        contentContainerClassName="px-6 py-6"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#16A34A" />
            </View>
          ) : (
            <Text className="py-6 text-center text-gray-400">
              No {tab} orders.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onOpen={openOrder}
            onAdvance={advance}
            updating={
              updateStatus.isPending &&
              updateStatus.variables?.orderId === item.id
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
