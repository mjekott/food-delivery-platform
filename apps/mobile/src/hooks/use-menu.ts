import type {
  ApiResponse,
  MenuCategory,
  MenuCategoryWithItems,
  MenuItem,
} from "@food-delivery/types";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/axios";

export const menuKeys = {
  list: (restaurantId: string) => ["menu", restaurantId] as const,
};

export interface CategoryInput {
  name: string;
}

export interface MenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

export type UpdateMenuItemInput = Partial<MenuItemInput> & {
  isAvailable?: boolean;
};

type MenuCache = MenuCategoryWithItems[];

/** Applies an updater to the cached menu for a restaurant, if present. */
function updateMenuCache(
  queryClient: QueryClient,
  restaurantId: string,
  updater: (menu: MenuCache) => MenuCache,
) {
  queryClient.setQueryData<MenuCache>(menuKeys.list(restaurantId), (menu) =>
    menu ? updater(menu) : menu,
  );
}

/** The full menu (categories with nested items) for a restaurant. */
export function useMenu(restaurantId?: string) {
  return useQuery({
    queryKey: menuKeys.list(restaurantId ?? ""),
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MenuCategoryWithItems[]>>(
        `/restaurants/${restaurantId}/menu`,
      );
      return data.data;
    },
  });
}

export function useCreateCategory(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const { data } = await api.post<ApiResponse<MenuCategory>>(
        `/restaurants/${restaurantId}/menu/categories`,
        input,
      );
      return data.data;
    },
    onSuccess: (category) => {
      updateMenuCache(queryClient, restaurantId, (menu) => [
        ...menu,
        { ...category, items: [] },
      ]);
      void queryClient.invalidateQueries({
        queryKey: menuKeys.list(restaurantId),
      });
    },
  });
}

export function useUpdateCategory(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      name,
    }: {
      categoryId: string;
      name: string;
    }) => {
      const { data } = await api.patch<ApiResponse<MenuCategory>>(
        `/restaurants/${restaurantId}/menu/categories/${categoryId}`,
        { name },
      );
      return data.data;
    },
    onSuccess: (category) => {
      updateMenuCache(queryClient, restaurantId, (menu) =>
        menu.map((existing) =>
          existing.id === category.id
            ? { ...existing, ...category }
            : existing,
        ),
      );
      void queryClient.invalidateQueries({
        queryKey: menuKeys.list(restaurantId),
      });
    },
  });
}

export function useDeleteCategory(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string) => {
      await api.delete(
        `/restaurants/${restaurantId}/menu/categories/${categoryId}`,
      );
      return categoryId;
    },
    onSuccess: (categoryId) => {
      updateMenuCache(queryClient, restaurantId, (menu) =>
        menu.filter((category) => category.id !== categoryId),
      );
      void queryClient.invalidateQueries({
        queryKey: menuKeys.list(restaurantId),
      });
    },
  });
}

export function useCreateItem(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MenuItemInput) => {
      const { data } = await api.post<ApiResponse<MenuItem>>(
        `/restaurants/${restaurantId}/menu/items`,
        input,
      );
      return data.data;
    },
    onSuccess: (item) => {
      updateMenuCache(queryClient, restaurantId, (menu) =>
        menu.map((category) =>
          category.id === item.categoryId
            ? { ...category, items: [...category.items, item] }
            : category,
        ),
      );
      void queryClient.invalidateQueries({
        queryKey: menuKeys.list(restaurantId),
      });
    },
  });
}

export function useUpdateItem(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      input,
    }: {
      itemId: string;
      input: UpdateMenuItemInput;
    }) => {
      const { data } = await api.patch<ApiResponse<MenuItem>>(
        `/restaurants/${restaurantId}/menu/items/${itemId}`,
        input,
      );
      return data.data;
    },
    onSuccess: (item) => {
      updateMenuCache(queryClient, restaurantId, (menu) =>
        // Drop the item from every category, then add it back under its
        // (possibly changed) category so a category move is handled.
        menu.map((category) => {
          const items = category.items.filter(
            (existing) => existing.id !== item.id,
          );
          if (category.id === item.categoryId) items.push(item);
          return { ...category, items };
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: menuKeys.list(restaurantId),
      });
    },
  });
}

export function useDeleteItem(restaurantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/restaurants/${restaurantId}/menu/items/${itemId}`);
      return itemId;
    },
    onSuccess: (itemId) => {
      updateMenuCache(queryClient, restaurantId, (menu) =>
        menu.map((category) => ({
          ...category,
          items: category.items.filter((item) => item.id !== itemId),
        })),
      );
      void queryClient.invalidateQueries({
        queryKey: menuKeys.list(restaurantId),
      });
    },
  });
}
