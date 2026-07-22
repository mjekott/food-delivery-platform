import type { Order } from "@food-delivery/types";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeliveryHistory, useDriverStats } from "@/hooks/use-driver";
import { useDriverSocket } from "@/hooks/use-driver-socket";
import { formatNaira } from "@/lib/format";
import { useDriverStore } from "@/store/driver";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-gray-100 py-4">
      <Text className="text-2xl font-bold text-black">{value}</Text>
      <Text className="mt-0.5 text-xs text-gray-500">{label}</Text>
    </View>
  );
}

function HistoryCard({ order }: { order: Order }) {
  return (
    <View className="rounded-2xl border border-gray-100 p-4">
      <View className="flex-row items-center justify-between">
        <View className="rounded-full bg-green-50 px-3 py-1">
          <Text className="text-xs font-semibold text-green-700">Delivered</Text>
        </View>
        <Text className="text-base font-bold text-black">
          {formatNaira(order.totalAmount)}
        </Text>
      </View>
      <View className="mt-3 flex-row items-start">
        <Ionicons name="location-outline" size={16} color="#9CA3AF" />
        <Text className="ml-1 flex-1 text-sm text-gray-600" numberOfLines={1}>
          {order.deliveryAddress}
        </Text>
      </View>
      <Text className="mt-1 text-xs text-gray-400">
        {new Date(order.createdAt).toDateString()}
      </Text>
    </View>
  );
}

export default function DriverHistoryScreen() {
  const isOnline = useDriverStore((s) => s.isOnline);
  const { data: stats } = useDriverStats();
  const {
    data: history,
    isLoading,
    isRefetching,
    refetch,
  } = useDeliveryHistory();

  useDriverSocket(isOnline);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={history ?? []}
          keyExtractor={(o) => o.id}
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={() => {
            void refetch();
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={
            <View>
              <Text className="pb-4 pt-2 text-3xl font-bold text-black">
                History
              </Text>
              <View className="flex-row gap-3">
                <Stat label="Total" value={stats?.totalDeliveries ?? 0} />
                <Stat label="Today" value={stats?.todayDeliveries ?? 0} />
                <Stat label="This week" value={stats?.weekDeliveries ?? 0} />
              </View>
              <Text className="mb-3 mt-6 text-lg font-bold text-black">
                Completed deliveries
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-12">
              <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
              <Text className="mt-3 text-base font-medium text-gray-500">
                No deliveries yet
              </Text>
              <Text className="mt-1 text-center text-gray-400">
                Your completed deliveries will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => <HistoryCard order={item} />}
        />
      )}
    </SafeAreaView>
  );
}
