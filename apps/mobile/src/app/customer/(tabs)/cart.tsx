import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { posthog } from "@/lib/posthog";
import { useCartStore } from "@/store/cart";

export default function CustomerCartScreen() {
  const insets = useSafeAreaInsets();
  const cart = useCartStore((s) => s.cart);
  const count = useCartStore((s) => s.itemCount);
  const subtotal = useCartStore((s) => s.subtotal);
  const addItem = useCartStore((s) => s.addItem);
  const decrement = useCartStore((s) => s.decrement);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    posthog.capture("cart_viewed");
  }, []);

  if (!cart) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-6 pb-2 pt-2">
          <Text className="text-3xl font-bold text-black">Cart</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cart-outline" size={44} color="#D1D5DB" />
          <Text className="mt-4 text-lg font-semibold text-black">
            Your cart is empty
          </Text>
          <Text className="mt-1 text-center text-gray-500">
            Browse restaurants and add items to get started.
          </Text>
          <Button
            label="Browse restaurants"
            className="mt-6 px-8"
            onPress={() => router.replace("/customer")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const restaurantRef = {
    id: cart.restaurantId,
    name: cart.restaurantName,
    imageUrl: cart.restaurantImageUrl,
  };
  const lines = Object.values(cart.lines);

  const confirmClear = () =>
    Alert.alert("Clear cart", "Remove all items from your cart?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => clearCart() },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pb-2 pt-2">
        <Text className="text-3xl font-bold text-black">Cart</Text>
        <Pressable onPress={confirmClear} hitSlop={8}>
          <Text className="text-sm font-medium text-red-500">Clear</Text>
        </Pressable>
      </View>

      {/* Restaurant this cart belongs to */}
      <View className="mx-6 mb-2 flex-row items-center rounded-2xl border border-gray-100 p-3">
        <View className="h-12 w-12 overflow-hidden rounded-xl bg-gray-100">
          {cart.restaurantImageUrl ? (
            <Image
              source={{ uri: cart.restaurantImageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="restaurant" size={20} color="#9CA3AF" />
            </View>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-black" numberOfLines={1}>
            {cart.restaurantName}
          </Text>
          <Text className="text-sm text-gray-500">
            {count} {count === 1 ? "item" : "items"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-40"
        showsVerticalScrollIndicator={false}
      >
        {lines.map(({ item, quantity }) => (
          <View
            key={item.id}
            className="flex-row items-center border-b border-gray-100 py-3"
          >
            <View className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Ionicons name="fast-food-outline" size={22} color="#9CA3AF" />
                </View>
              )}
            </View>

            <View className="ml-3 flex-1">
              <Text
                className="text-[15px] font-semibold text-black"
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-500">
                {formatNaira(item.price)} each
              </Text>
              <Text className="mt-1 text-[15px] font-bold text-black">
                {formatNaira(String(Number(item.price) * quantity))}
              </Text>
            </View>

            <View className="items-end">
              <Pressable
                onPress={() => removeItem(item.id)}
                hitSlop={8}
                className="mb-2"
              >
                <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
              </Pressable>
              <View className="flex-row items-center rounded-full bg-gray-100">
                <Pressable
                  onPress={() => decrement(item.id)}
                  hitSlop={6}
                  className="h-8 w-8 items-center justify-center"
                >
                  <Ionicons name="remove" size={18} color="#111827" />
                </Pressable>
                <Text className="w-6 text-center text-[15px] font-bold text-black">
                  {quantity}
                </Text>
                <Pressable
                  onPress={() => addItem(restaurantRef, item)}
                  hitSlop={6}
                  className="h-8 w-8 items-center justify-center"
                >
                  <Ionicons name="add" size={18} color="#111827" />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Totals + checkout — lifted above the native tab bar */}
      <View
        style={{ paddingBottom: insets.bottom + 64 }}
        className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-6 pt-4"
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-500">
            Subtotal · {count} {count === 1 ? "item" : "items"}
          </Text>
          <Text className="text-lg font-bold text-black">
            {formatNaira(String(subtotal))}
          </Text>
        </View>
        <Button
          label="Checkout"
          className="mt-4"
          onPress={() => router.push("/customer/checkout")}
        />
      </View>
    </SafeAreaView>
  );
}
