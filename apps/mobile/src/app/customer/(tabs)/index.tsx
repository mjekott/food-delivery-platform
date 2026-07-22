import type { Restaurant } from "@food-delivery/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRestaurants } from "@/hooks/use-restaurants";

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Pressable
      onPress={() => router.push(`/customer/restaurant/${restaurant.id}`)}
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
    >
      {restaurant.imageUrl ? (
        <Image
          source={{ uri: restaurant.imageUrl }}
          style={{ width: "100%", height: 160 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-40 w-full items-center justify-center bg-gray-100">
          <Ionicons name="restaurant-outline" size={32} color="#9CA3AF" />
        </View>
      )}
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 pr-2 text-lg font-semibold text-black"
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text className="ml-1 text-sm font-medium text-gray-700">
              {Number(restaurant.rating).toFixed(1)}
            </Text>
          </View>
        </View>
        <Text className="mt-1 text-sm text-gray-500" numberOfLines={1}>
          {restaurant.address}
        </Text>
      </View>
    </Pressable>
  );
}

export default function CustomerHomeScreen() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const {
    data,
    isLoading,
    isFetching,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRestaurants(debouncedSearch);

  const restaurants = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // A fresh search is refetching with results already on screen.
  const isSearching = isFetching && !isLoading && !isRefetching;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pb-3 pt-2">
        <Text className="text-3xl font-bold text-black">Discover</Text>
        <View className="mt-4 flex-row items-center rounded-2xl border border-gray-200 px-4">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search restaurants or address"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className="flex-1 py-4 pl-3 text-base text-black"
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#9CA3AF" />
          ) : search.length > 0 ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#16A34A" />
        </View>
      ) : restaurants.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="storefront-outline" size={40} color="#9CA3AF" />
          <Text className="mt-4 text-lg font-semibold text-black">
            No restaurants found
          </Text>
          <Text className="mt-1 text-center text-gray-500">
            {debouncedSearch
              ? "Try a different search."
              : "Check back soon for restaurants near you."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(restaurant) => restaurant.id}
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="h-4" />}
          renderItem={({ item }) => <RestaurantCard restaurant={item} />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              tintColor="#111827"
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-6">
                <ActivityIndicator color="#16A34A" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
