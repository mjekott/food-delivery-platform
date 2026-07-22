import { Stack } from "expo-router";

export default function CustomerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="restaurant/[id]" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="order/[id]" />
    </Stack>
  );
}
