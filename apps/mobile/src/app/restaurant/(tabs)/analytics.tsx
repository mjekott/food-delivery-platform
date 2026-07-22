import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRestaurantAnalytics } from "@/hooks/use-analytics";
import { useOrderUpdates } from "@/hooks/use-order-socket";
import { formatCompactNaira, formatNaira } from "@/lib/format";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function StatCard({
  icon,
  tint,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-gray-100 p-4">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: `${tint}1A` }}
      >
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text className="mt-3 text-2xl font-bold text-black" numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-0.5 text-xs text-gray-500">{label}</Text>
    </View>
  );
}

function WeeklyChart({
  data,
}: {
  data: { date: string; revenue: string }[];
}) {
  const values = data.map((d) => Number(d.revenue));
  const max = Math.max(1, ...values);

  return (
    <View className="rounded-2xl border border-gray-100 p-4">
      <Text className="text-base font-bold text-black">Revenue · last 7 days</Text>
      <View className="mt-4 h-40 flex-row items-end justify-between">
        {data.map((day) => {
          const value = Number(day.revenue);
          const heightPct = Math.round((value / max) * 100);
          const weekday = DAY_LABELS[new Date(`${day.date}T00:00:00`).getDay()];
          return (
            <View key={day.date} className="flex-1 items-center">
              <Text className="mb-1 text-[10px] font-medium text-gray-400">
                {value > 0 ? formatCompactNaira(value) : ""}
              </Text>
              <View className="h-28 w-6 justify-end overflow-hidden rounded-full bg-gray-100">
                <View
                  className="w-full rounded-full bg-green-500"
                  style={{ height: `${Math.max(value > 0 ? 6 : 0, heightPct)}%` }}
                />
              </View>
              <Text className="mt-2 text-[11px] text-gray-500">{weekday}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function RestaurantAnalyticsScreen() {
  const { data, isLoading, isRefetching, refetch } = useRestaurantAnalytics();

  // Keep the owner connected so orders/deletions invalidate analytics live.
  useOrderUpdates();

  if (isLoading || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#16A34A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerClassName="px-6 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#111827"
          />
        }
      >
        <Text className="pb-4 pt-2 text-3xl font-bold text-black">Analytics</Text>

        <View className="flex-row gap-3">
          <StatCard
            icon="receipt-outline"
            tint="#2563EB"
            label="Today's orders"
            value={String(data.todayOrders)}
          />
          <StatCard
            icon="cash-outline"
            tint="#16A34A"
            label="Today's revenue"
            value={formatNaira(data.todayRevenue)}
          />
        </View>
        <View className="mt-3 flex-row gap-3">
          <StatCard
            icon="cube-outline"
            tint="#7C3AED"
            label="Total orders"
            value={String(data.totalOrders)}
          />
          <StatCard
            icon="trending-up-outline"
            tint="#EA580C"
            label="Total revenue"
            value={formatNaira(data.totalRevenue)}
          />
        </View>

        <View className="mt-4">
          <WeeklyChart data={data.weeklyRevenue} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
