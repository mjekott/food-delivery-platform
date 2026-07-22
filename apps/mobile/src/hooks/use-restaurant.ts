import type { ApiResponse, Restaurant } from "@food-delivery/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";

export const restaurantKeys = {
  mine: ["restaurant", "mine"] as const,
};

export interface RestaurantInput {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  imageUrl?: string;
}

export type UpdateRestaurantInput = Partial<RestaurantInput> & {
  isOpen?: boolean;
};

/** The current owner's restaurant, or null if they haven't created one. */
export function useMyRestaurant() {
  return useQuery({
    queryKey: restaurantKeys.mine,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Restaurant | null>>(
        "/restaurants/me",
      );
      return data.data;
    },
  });
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RestaurantInput) => {
      const { data } = await api.post<ApiResponse<Restaurant>>(
        "/restaurants",
        input,
      );
      return data.data;
    },
    onSuccess: (restaurant) => {
      queryClient.setQueryData(restaurantKeys.mine, restaurant);
    },
  });
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateRestaurantInput;
    }) => {
      const { data } = await api.patch<ApiResponse<Restaurant>>(
        `/restaurants/${id}`,
        input,
      );
      return data.data;
    },
    onSuccess: (restaurant) => {
      queryClient.setQueryData(restaurantKeys.mine, restaurant);
    },
  });
}
