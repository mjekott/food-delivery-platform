import type { MenuCategory, MenuItem } from "@food-delivery/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { useRef, useState } from "react";
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

import {
  CategoryForm,
  type CategoryFormValues,
} from "@/components/category-form";
import {
  MenuItemForm,
  type MenuItemFormValues,
} from "@/components/menu-item-form";
import { Button } from "@/components/ui/button";
import { BottomSheet, type BottomSheetRef } from "@/components/ui/bottom-sheet";
import {
  useCreateCategory,
  useCreateItem,
  useDeleteCategory,
  useDeleteItem,
  useMenu,
  useUpdateCategory,
  useUpdateItem,
} from "@/hooks/use-menu";
import { useMyRestaurant } from "@/hooks/use-restaurant";
import { formatNaira } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { posthog } from "@/lib/posthog";

export default function RestaurantMenuScreen() {
  const { data: restaurant, isLoading: restaurantLoading } = useMyRestaurant();
  const restaurantId = restaurant?.id ?? "";
  const {
    data: menu,
    isLoading: menuLoading,
    isRefetching: menuRefetching,
    refetch: refetchMenu,
  } = useMenu(restaurant?.id);

  const createCategory = useCreateCategory(restaurantId);
  const updateCategory = useUpdateCategory(restaurantId);
  const deleteCategory = useDeleteCategory(restaurantId);
  const createItem = useCreateItem(restaurantId);
  const updateItem = useUpdateItem(restaurantId);
  const deleteItem = useDeleteItem(restaurantId);

  const categorySheet = useRef<BottomSheetRef>(null);
  const itemSheet = useRef<BottomSheetRef>(null);

  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null,
  );
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemCategoryId, setItemCategoryId] = useState<string>("");

  const categories = menu ?? [];

  const openAddCategory = () => {
    setEditingCategory(null);
    categorySheet.current?.present();
  };

  const openEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    categorySheet.current?.present();
  };

  const openAddItem = (categoryId: string) => {
    setEditingItem(null);
    setItemCategoryId(categoryId);
    itemSheet.current?.present();
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemCategoryId(item.categoryId);
    itemSheet.current?.present();
  };

  const onSubmitCategory = (values: CategoryFormValues) => {
    const name = values.name.trim();
    const handlers = {
      onSuccess: () => {
        toast.success(editingCategory ? "Category updated" : "Category added");
        categorySheet.current?.dismiss();
      },
      onError: (error: unknown) => toast.error(getErrorMessage(error)),
    };

    if (editingCategory) {
      updateCategory.mutate(
        { categoryId: editingCategory.id, name },
        handlers,
      );
    } else {
      createCategory.mutate({ name }, handlers);
    }
  };

  const onSubmitItem = (values: MenuItemFormValues) => {
    const payload = {
      categoryId: values.categoryId,
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      price: Number(values.price),
      imageUrl: values.imageUrl?.trim() || undefined,
    };
    const handlers = {
      onSuccess: () => {
        posthog.capture(editingItem ? "menu_item_updated" : "menu_item_created", {
          restaurant_id: restaurantId,
          has_image: !!payload.imageUrl,
        });
        toast.success(editingItem ? "Item updated" : "Item added");
        itemSheet.current?.dismiss();
      },
      onError: (error: unknown) => toast.error(getErrorMessage(error)),
    };

    if (editingItem) {
      updateItem.mutate({ itemId: editingItem.id, input: payload }, handlers);
    } else {
      createItem.mutate(payload, handlers);
    }
  };

  const confirmDeleteCategory = (category: MenuCategory) => {
    Alert.alert(
      "Delete category",
      `Delete "${category.name}" and all its items?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteCategory.mutate(category.id, {
              onSuccess: () => toast.success("Category deleted"),
              onError: (error) => toast.error(getErrorMessage(error)),
            }),
        },
      ],
    );
  };

  const confirmDeleteItem = (item: MenuItem) => {
    Alert.alert("Delete item", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteItem.mutate(item.id, {
            onSuccess: () => toast.success("Item deleted"),
            onError: (error) => toast.error(getErrorMessage(error)),
          }),
      },
    ]);
  };

  if (restaurantLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#111827" />
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="restaurant-outline" size={40} color="#9CA3AF" />
          <Text className="mt-4 text-xl font-bold text-black">
            No restaurant yet
          </Text>
          <Text className="mt-2 text-center text-gray-500">
            Create your restaurant to start building a menu.
          </Text>
          <Link href="/restaurant/create" asChild>
            <Button label="Create restaurant" className="mt-6 px-8" />
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <View>
          <Text className="text-3xl font-bold text-black">Menu</Text>
          <Text className="mt-1 text-sm text-gray-500">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          </Text>
        </View>
        <Button
          label="Add category"
          size="sm"
          leftIcon={<Ionicons name="add" size={18} color="#ffffff" />}
          onPress={openAddCategory}
        />
      </View>

      {menuLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#111827" />
        </View>
      ) : categories.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="fast-food-outline" size={40} color="#9CA3AF" />
          <Text className="mt-4 text-xl font-bold text-black">
            No categories yet
          </Text>
          <Text className="mt-2 text-center text-gray-500">
            Add a category like &quot;Starters&quot; or &quot;Drinks&quot;, then
            fill it with items.
          </Text>
          <Button
            label="Add your first category"
            className="mt-6 px-8"
            onPress={openAddCategory}
          />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(category) => category.id}
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={menuRefetching}
              onRefresh={() => {
                void refetchMenu();
              }}
              tintColor="#111827"
            />
          }
          ItemSeparatorComponent={() => <View className="h-4" />}
          renderItem={({ item: category }) => (
            <View className="rounded-2xl border border-gray-200 bg-white">
              <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
                <Text className="flex-1 pr-2 text-lg font-semibold text-black">
                  {category.name}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Pressable
                    onPress={() => openEditCategory(category)}
                    hitSlop={8}
                    className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                  >
                    <Ionicons name="pencil" size={16} color="#111827" />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDeleteCategory(category)}
                    hitSlop={8}
                    className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              </View>

              {category.items.length === 0 ? (
                <Text className="px-4 py-4 text-sm text-gray-400">
                  No items in this category yet.
                </Text>
              ) : (
                category.items.map((menuItem, index) => (
                  <Pressable
                    key={menuItem.id}
                    onPress={() => openEditItem(menuItem)}
                    className={`flex-row items-center px-4 py-3 ${
                      index > 0 ? "border-t border-gray-50" : ""
                    }`}
                  >
                    {menuItem.imageUrl ? (
                      <Image
                        source={{ uri: menuItem.imageUrl }}
                        style={{ width: 48, height: 48, borderRadius: 12 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                        <Ionicons
                          name="fast-food-outline"
                          size={20}
                          color="#9CA3AF"
                        />
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-medium text-black">
                        {menuItem.name}
                      </Text>
                      <Text className="mt-0.5 text-sm text-gray-500">
                        {formatNaira(menuItem.price)}
                        {!menuItem.isAvailable ? "  ·  Unavailable" : ""}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => confirmDeleteItem(menuItem)}
                      hitSlop={8}
                      className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </Pressable>
                  </Pressable>
                ))
              )}

              <Pressable
                onPress={() => openAddItem(category.id)}
                className="flex-row items-center gap-1.5 border-t border-gray-100 px-4 py-3"
              >
                <Ionicons name="add" size={18} color="#111827" />
                <Text className="text-sm font-medium text-black">Add item</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <BottomSheet
        ref={categorySheet}
        title={editingCategory ? "Edit category" : "Add category"}
      >
        <CategoryForm
          key={editingCategory?.id ?? "new-category"}
          defaultValues={
            editingCategory ? { name: editingCategory.name } : undefined
          }
          submitLabel={editingCategory ? "Save changes" : "Add category"}
          isSubmitting={createCategory.isPending || updateCategory.isPending}
          onSubmit={onSubmitCategory}
        />
      </BottomSheet>

      <BottomSheet
        ref={itemSheet}
        title={editingItem ? "Edit item" : "Add item"}
      >
        <MenuItemForm
          key={editingItem?.id ?? `new-item-${itemCategoryId}`}
          categories={categories}
          defaultValues={
            editingItem
              ? {
                  categoryId: editingItem.categoryId,
                  name: editingItem.name,
                  description: editingItem.description ?? "",
                  price: editingItem.price,
                  imageUrl: editingItem.imageUrl ?? "",
                }
              : { categoryId: itemCategoryId }
          }
          submitLabel={editingItem ? "Save changes" : "Add item"}
          isSubmitting={createItem.isPending || updateItem.isPending}
          onSubmit={onSubmitItem}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}
