import type { Order } from "@food-delivery/types";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { useDriverSocket } from "@/hooks/use-driver-socket";
import {
  useAcceptOrder,
  useActiveDeliveries,
  useAvailableOrders,
  useDriverStatus,
  useSetAvailability,
} from "@/hooks/use-driver";
import { formatNaira } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDriverStore } from "@/store/driver";

function AvailableCard({
  order,
  onAccept,
  accepting,
}: {
  order: Order;
  onAccept: (order: Order) => void;
  accepting: boolean;
}) {
  return (
    <View className="rounded-2xl border border-gray-100 p-4">
      <View className="flex-row items-center justify-between">
        <View className="rounded-full bg-green-50 px-3 py-1">
          <Text className="text-xs font-semibold text-green-700">
            Ready for pickup
          </Text>
        </View>
        <Text className="text-base font-bold text-black">
          {formatNaira(order.totalAmount)}
        </Text>
      </View>
      <View className="mt-3 flex-row items-start">
        <Ionicons name="location-outline" size={16} color="#9CA3AF" />
        <Text className="ml-1 flex-1 text-sm text-gray-600" numberOfLines={2}>
          {order.deliveryAddress}
        </Text>
      </View>
      <Button
        label="Accept delivery"
        size="sm"
        className="mt-3"
        loading={accepting}
        onPress={() => onAccept(order)}
      />
    </View>
  );
}

export default function DriverHomeScreen() {
  const { isOnline, setOnline } = useDriverStore();
  const { data: serverStatus } = useDriverStatus();
  const setAvailability = useSetAvailability();
  const acceptOrder = useAcceptOrder();
  const { data: activeDeliveries } = useActiveDeliveries();

  // Reflect the server's online state in the toggle (e.g. still online from a
  // previous session).
  useEffect(() => {
    if (serverStatus) setOnline(serverStatus.isOnline);
  }, [serverStatus?.isOnline, setOnline]);
  const {
    data: available,
    isLoading,
    isRefetching,
    refetch,
  } = useAvailableOrders(isOnline);

  useDriverSocket(isOnline);

  const hasActiveDelivery = (activeDeliveries ?? []).length > 0;

  // Going offline when the app leaves the foreground (≈ the driver exits).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && useDriverStore.getState().isOnline) {
        setAvailability.mutate(false);
        setOnline(false);
      }
    });
    return () => sub.remove();
  }, [setAvailability, setOnline]);

  const onToggle = (next: boolean) => {
    if (!next && hasActiveDelivery) {
      Alert.alert(
        "Active delivery",
        "Finish your active delivery before going offline.",
      );
      return;
    }
    setAvailability.mutate(next, {
      onSuccess: () => setOnline(next),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  const accept = (order: Order) => {
    acceptOrder.mutate(order.id, {
      onSuccess: () => toast.success("Delivery accepted"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pb-3 pt-2">
        <Text className="text-3xl font-bold text-black">Deliveries</Text>
      </View>

      {/* Online toggle */}
      <View className="mx-6 flex-row items-center justify-between rounded-2xl border border-gray-200 px-4 py-4">
        <View className="flex-1 pr-4">
          <View className="flex-row items-center">
            <View
              className={`h-2.5 w-2.5 rounded-full ${
                isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <Text className="ml-2 text-base font-semibold text-black">
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
          <Text className="mt-1 text-sm text-gray-500">
            {isOnline
              ? "You're receiving delivery requests."
              : "Go online to receive delivery requests."}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={onToggle}
          disabled={setAvailability.isPending}
          trackColor={{ true: "#16A34A" }}
        />
      </View>

      {hasActiveDelivery ? (
        <Text className="mx-6 mt-2 text-xs text-amber-600">
          You have an active delivery — finish it to go offline.
        </Text>
      ) : null}

      {!isOnline ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={40} color="#D1D5DB" />
          <Text className="mt-3 text-base font-medium text-gray-500">
            You're offline
          </Text>
          <Text className="mt-1 text-center text-gray-400">
            Available deliveries appear here once you go online.
          </Text>
        </View>
      ) : (
        <FlatList
          data={available ?? []}
          keyExtractor={(o) => o.id}
          contentContainerClassName="px-6 pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={
            <Text className="mb-3 text-lg font-bold text-black">
              Available for pickup
            </Text>
          }
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#16A34A" />
              </View>
            ) : (
              <Text className="py-6 text-center text-gray-400">
                No deliveries available right now.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <AvailableCard
              order={item}
              onAccept={accept}
              accepting={
                acceptOrder.isPending && acceptOrder.variables === item.id
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
