import type { Order } from "@food-delivery/types";
import { OrderStatus } from "@food-delivery/types";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { useOrderUpdates } from "@/hooks/use-order-socket";
import {
  useCancelOrder,
  useInitializePayment,
  useOrders,
  useVerifyPayment,
} from "@/hooks/use-orders";
import { formatNaira } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { posthog } from "@/lib/posthog";

type Tab = "pending" | "ongoing" | "completed";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
];

const ONGOING_STATUSES = new Set<OrderStatus>([
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
]);

function tabOf(status: OrderStatus): Tab {
  if (status === OrderStatus.PENDING) return "pending";
  if (ONGOING_STATUSES.has(status)) return "ongoing";
  return "completed";
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Awaiting payment",
  [OrderStatus.CONFIRMED]: "Confirmed",
  [OrderStatus.PREPARING]: "Preparing",
  [OrderStatus.READY]: "Ready",
  [OrderStatus.OUT_FOR_DELIVERY]: "Out for delivery",
  [OrderStatus.DELIVERED]: "Delivered",
  [OrderStatus.CANCELLED]: "Cancelled",
};

function statusTone(status: OrderStatus) {
  if (status === OrderStatus.PENDING) return "bg-amber-50 text-amber-700";
  if (status === OrderStatus.DELIVERED) return "bg-green-50 text-green-700";
  if (status === OrderStatus.CANCELLED) return "bg-gray-100 text-gray-500";
  return "bg-blue-50 text-blue-700";
}

/** Ticking mm:ss remaining until `expiresAt`; calls onExpire once at zero. */
function Countdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(next);
      if (next <= 0) onExpire();
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  if (remaining <= 0) {
    return <Text className="text-sm font-medium text-red-500">Expired</Text>;
  }
  const totalSeconds = Math.floor(remaining / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return (
    <Text className="text-sm font-medium text-gray-500">
      Pay within {mm}:{ss}
    </Text>
  );
}

function OrderCard({
  order,
  onOpen,
  onPay,
  onCancel,
  paying,
  cancelling,
}: {
  order: Order;
  onOpen: (order: Order) => void;
  onPay: (order: Order) => void;
  onCancel: (order: Order) => void;
  paying: boolean;
  cancelling: boolean;
}) {
  const [expired, setExpired] = useState(false);
  const [badgeBg, badgeText] = statusTone(order.status).split(" ");
  const isPending = order.status === OrderStatus.PENDING;

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

      <Text className="mt-3 text-sm text-gray-500">
        {new Date(order.createdAt).toDateString()}
      </Text>
      <Text className="mt-0.5 text-xs text-gray-400" numberOfLines={1}>
        {order.deliveryAddress}
      </Text>

      {isPending ? (
        <View className="mt-3">
          {order.expiresAt ? (
            <Countdown
              expiresAt={order.expiresAt}
              onExpire={() => setExpired(true)}
            />
          ) : null}
          <View className="mt-2 flex-row gap-3">
            <Button
              label="Cancel"
              variant="outline"
              size="sm"
              className="flex-1"
              loading={cancelling}
              onPress={() => onCancel(order)}
            />
            <Button
              label={expired ? "Expired" : "Pay now"}
              size="sm"
              className="flex-1"
              disabled={expired}
              loading={paying}
              onPress={() => onPay(order)}
            />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function CustomerOrdersScreen() {
  const [tab, setTab] = useState<Tab>("pending");
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data: orders, isLoading, isRefetching, refetch } = useOrders();
  const initPayment = useInitializePayment();
  const verifyPayment = useVerifyPayment();
  const cancelOrder = useCancelOrder();

  // The customer auto-joins their personal room on connect, so every order
  // they placed streams status updates into the cache live.
  useOrderUpdates();

  const confirmCancel = (order: Order) => {
    Alert.alert("Cancel order", "Cancel this order before payment?", [
      { text: "Keep order", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: () =>
          cancelOrder.mutate(order.id, {
            onSuccess: () => toast.success("Order cancelled"),
            onError: (error) => toast.error(getErrorMessage(error)),
          }),
      },
    ]);
  };

  const openOrder = (order: Order) =>
    router.push(`/customer/order/${order.id}`);

  useEffect(() => {
    posthog.capture("orders_viewed");
  }, []);

  const visible = useMemo(
    () => (orders ?? []).filter((o) => tabOf(o.status) === tab),
    [orders, tab],
  );

  const pay = async (order: Order) => {
    try {
      setPayingId(order.id);
      const callbackUrl = Linking.createURL("payment-complete");
      const { authorizationUrl } = await initPayment.mutateAsync({
        orderId: order.id,
        callbackUrl,
      });
      await WebBrowser.openAuthSessionAsync(authorizationUrl, callbackUrl);
      // Confirm with the server regardless of how the browser closed.
      const updated = await verifyPayment.mutateAsync(order.id);
      if (updated.status === OrderStatus.PENDING) {
        toast("Payment not completed yet");
      } else {
        posthog.capture("order_paid", { order_id: order.id });
        toast.success("Payment successful");
        setTab("ongoing");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPayingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pb-3 pt-2">
        <Text className="text-3xl font-bold text-black">Orders</Text>
      </View>

      {/* Tabs */}
      <View className="mx-6 mb-3 flex-row rounded-full bg-gray-100 p-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 items-center rounded-full py-2 ${
                active ? "bg-white" : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  active ? "text-black" : "text-gray-500"
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16A34A" />
        </View>
      ) : visible.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
          <Text className="mt-3 text-base font-medium text-gray-500">
            No {tab} orders
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(o) => o.id}
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              tintColor="#111827"
            />
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onOpen={openOrder}
              onPay={pay}
              onCancel={confirmCancel}
              paying={payingId === item.id}
              cancelling={
                cancelOrder.isPending && cancelOrder.variables === item.id
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
