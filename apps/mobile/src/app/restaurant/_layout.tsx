import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useMyRestaurant } from "@/hooks/use-restaurant";

export default function RestaurantLayout() {
  const { data: restaurant, isLoading } = useMyRestaurant();
  const segments = useSegments() as string[];
  const onCreate = segments.includes("create");

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#16A34A" />
      </View>
    );
  }

  // Owner has no restaurant yet → force them to the create screen.
  if (!restaurant && !onCreate) {
    return <Redirect href="/restaurant/create" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="order/[id]" />
    </Stack>
  );
}
