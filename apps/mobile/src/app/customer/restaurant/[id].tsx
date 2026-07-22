import { Ionicons } from "@expo/vector-icons";
import type { MenuItem } from "@food-delivery/types";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  MenuItemSheet,
  type MenuItemSheetRef,
} from "@/components/menu-item-sheet";
import { useMenu } from "@/hooks/use-menu";
import { useRestaurant } from "@/hooks/use-restaurants";
import { formatNaira } from "@/lib/format";
import { useCartStore } from "@/store/cart";

const HERO_HEIGHT = 240;

const FLOATING_SHADOW = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 4,
};

function RoundButton({
  icon,
  onPress,
  color = "#111827",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={FLOATING_SHADOW}
      className="h-10 w-10 items-center justify-center rounded-full bg-white"
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-1 items-center py-3">
      <View className="flex-row items-center">{children}</View>
      <Text className="mt-1 text-xs text-gray-400">{label}</Text>
    </View>
  );
}

function MenuRow({
  item,
  restaurantId,
  onPress,
}: {
  item: MenuItem;
  restaurantId: string;
  onPress: () => void;
}) {
  const quantity = useCartStore((s) =>
    s.cart?.restaurantId === restaurantId
      ? (s.cart.lines[item.id]?.quantity ?? 0)
      : 0,
  );

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-start border-b border-gray-100 px-5 py-4"
    >
      <View className="flex-1 pr-3">
        <Text className="text-[15px] font-semibold leading-5 text-black">
          {item.name}
        </Text>
        {item.description ? (
          <Text
            className="mt-1 text-[13px] leading-5 text-gray-400"
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}
        <Text className="mt-2 text-[15px] font-bold text-black">
          {formatNaira(item.price)}
        </Text>
      </View>

      <View className="w-28">
        <View className="overflow-hidden rounded-2xl">
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: "100%", height: 84 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{ height: 84 }}
              className="w-full items-center justify-center bg-gray-100"
            >
              <Ionicons name="fast-food-outline" size={22} color="#9CA3AF" />
            </View>
          )}
          <View
            className={`flex-row items-center justify-center py-2.5 ${
              item.isAvailable ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                item.isAvailable ? "text-green-800" : "text-gray-400"
              }`}
            >
              {!item.isAvailable
                ? "Sold out"
                : quantity > 0
                  ? `${quantity} in cart`
                  : "Add +"}
            </Text>
          </View>
        </View>
        {quantity > 0 ? (
          <View className="absolute right-2 top-2 h-6 min-w-6 items-center justify-center rounded-full bg-black px-1.5">
            <Text className="text-xs font-bold text-white">{quantity}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const itemSheet = useRef<MenuItemSheetRef>(null);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [liked, setLiked] = useState(false);
  const cart = useCartStore((s) => s.cart);
  const cartItemCount = useCartStore((s) => s.itemCount);
  const cartSubtotalValue = useCartStore((s) => s.subtotal);

  const { data: restaurant, isLoading } = useRestaurant(id);
  const { data: menu, isLoading: menuLoading } = useMenu(id);

  const categories = useMemo(() => menu ?? [], [menu]);
  const allItems = useMemo(
    () => categories.flatMap((c) => c.items),
    [categories],
  );
  const visibleItems =
    activeCat === "all"
      ? allItems
      : (categories.find((c) => c.id === activeCat)?.items ?? []);

  const headerHeight = insets.top + 52;

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - headerHeight - 40, HERO_HEIGHT - headerHeight],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#16A34A" />
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="p-4">
          <RoundButton icon="chevron-back" onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={40} color="#9CA3AF" />
          <Text className="mt-3 text-lg font-semibold text-black">
            Restaurant not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOpen = restaurant.isOpen === "true";
  const cartIsThisRestaurant = cart?.restaurantId === restaurant.id;
  const cartCount = cartIsThisRestaurant ? cartItemCount : 0;
  const cartTotal = cartIsThisRestaurant ? cartSubtotalValue : 0;

  return (
    <View className="flex-1 bg-white">
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        {/* Hero + restaurant info (index 0) — negative margin cancels the sticky
            tab bar's top padding while it's still in normal flow. */}
        <View style={{ marginBottom: 8 - headerHeight }}>
          <View>
            {restaurant.imageUrl ? (
              <Image
                source={{ uri: restaurant.imageUrl }}
                style={{ width: "100%", height: HERO_HEIGHT }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{ height: HERO_HEIGHT }}
                className="w-full items-center justify-center bg-gray-200"
              >
                <Ionicons name="restaurant-outline" size={44} color="#9CA3AF" />
              </View>
            )}
          </View>

          {/* Overlapping avatar */}
          <View className="-mt-8 items-center">
            <View
              style={FLOATING_SHADOW}
              className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-100"
            >
              {restaurant.imageUrl ? (
                <Image
                  source={{ uri: restaurant.imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="restaurant" size={24} color="#9CA3AF" />
              )}
            </View>
          </View>

          <Text className="mt-3 px-6 text-center text-xl font-bold text-black">
            {restaurant.name}
          </Text>

          <View className="mt-2 flex-row items-center justify-center">
            <View
              className={`h-2 w-2 rounded-full ${isOpen ? "bg-green-500" : "bg-gray-400"}`}
            />
            <Text
              className={`ml-1.5 text-sm font-medium ${isOpen ? "text-green-700" : "text-gray-500"}`}
            >
              {isOpen ? "Open now" : "Closed"}
            </Text>
          </View>

          {/* Stats card */}
          <View className="mx-5 mt-4 flex-row rounded-2xl border border-gray-200">
            <Stat label="Ratings">
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text className="ml-1 text-base font-bold text-black">
                {Number(restaurant.rating).toFixed(1)}
              </Text>
            </Stat>
            <View className="my-3 w-px bg-gray-200" />
            <Stat label="Menu items">
              <Text className="text-base font-bold text-black">
                {allItems.length}
              </Text>
            </Stat>
            <View className="my-3 w-px bg-gray-200" />
            <Stat label="Categories">
              <Text className="text-base font-bold text-black">
                {categories.length}
              </Text>
            </Stat>
          </View>

          <View className="mx-5 mt-4 flex-row items-start">
            <Ionicons name="location-outline" size={18} color="#9CA3AF" />
            <Text className="ml-2 flex-1 text-sm leading-5 text-gray-600">
              {restaurant.address}
            </Text>
          </View>
          {restaurant.description ? (
            <Text className="mx-5 mt-2 text-sm leading-6 text-gray-500">
              {restaurant.description}
            </Text>
          ) : null}
        </View>

        {/* Sticky category tabs (index 1). The top padding (transparent) leaves
            room for the floating header so the chips clear it when stuck; only
            the chips row itself is opaque, so nothing above gets covered. */}
        <View style={{ paddingTop: headerHeight }}>
          <View className="border-b border-gray-100 bg-white">
            {categories.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 px-5 py-3"
              >
                {[{ id: "all", name: "All" }, ...categories].map((cat) => {
                  const active = activeCat === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setActiveCat(cat.id)}
                      className={`rounded-full px-4 py-2 ${
                        active ? "bg-green-100" : "bg-gray-50"
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          active ? "text-green-700" : "text-gray-500"
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View className="h-2" />
            )}
          </View>
        </View>

        {/* Menu list (index 2) */}
        <View className="pb-12">
          {menuLoading ? (
            <View className="py-10">
              <ActivityIndicator color="#16A34A" />
            </View>
          ) : visibleItems.length === 0 ? (
            <View className="items-center px-6 py-12">
              <Ionicons name="fast-food-outline" size={32} color="#D1D5DB" />
              <Text className="mt-2 text-gray-400">
                {categories.length === 0
                  ? "This restaurant hasn't added a menu yet."
                  : "No items in this category."}
              </Text>
            </View>
          ) : (
            visibleItems.map((item) => (
              <MenuRow
                key={item.id}
                item={item}
                restaurantId={restaurant.id}
                onPress={() => itemSheet.current?.present(item)}
              />
            ))
          )}
        </View>

        {cartCount > 0 ? <View style={{ height: 92 }} /> : null}
      </Animated.ScrollView>

      {/* Floating "View cart" bar — total items + total price for this cart */}
      {cartCount > 0 ? (
        <View
          style={{ paddingBottom: insets.bottom + 12 }}
          className="absolute bottom-0 left-0 right-0 px-5 pt-3"
        >
          <Pressable
            onPress={() => router.push("/customer/cart")}
            style={FLOATING_SHADOW}
            className="flex-row items-center justify-between rounded-2xl bg-black px-5 py-4"
          >
            <View className="flex-row items-center">
              <View className="min-w-6 items-center rounded-full bg-white/20 px-2 py-0.5">
                <Text className="text-xs font-bold text-white">{cartCount}</Text>
              </View>
              <Text className="ml-2 text-base font-semibold text-white">
                View cart
              </Text>
            </View>
            <Text className="text-base font-bold text-white">
              {formatNaira(String(cartTotal))}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Floating header — rendered last so it always paints above the hero.
          Its white background fades in once the hero scrolls away. */}
      <Animated.View
        pointerEvents="box-none"
        style={{ height: headerHeight, paddingTop: insets.top }}
        className="absolute left-0 right-0 top-0 z-30 justify-center"
      >
        <Animated.View
          pointerEvents="none"
          style={{ opacity: headerBgOpacity }}
          className="absolute inset-0 border-b border-gray-100 bg-white"
        />
        <View className="flex-row items-center justify-between px-4">
          <RoundButton icon="chevron-back" onPress={() => router.back()} />
          <Animated.Text
            numberOfLines={1}
            style={{ opacity: headerBgOpacity }}
            className="mx-3 flex-1 text-center text-base font-bold text-black"
          >
            {restaurant.name}
          </Animated.Text>
          <RoundButton
            icon={liked ? "heart" : "heart-outline"}
            color={liked ? "#EF4444" : "#111827"}
            onPress={() => setLiked((prev) => !prev)}
          />
        </View>
      </Animated.View>

      <MenuItemSheet
        ref={itemSheet}
        restaurant={{
          id: restaurant.id,
          name: restaurant.name,
          imageUrl: restaurant.imageUrl,
        }}
      />
    </View>
  );
}
