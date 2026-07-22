import type {
  ApiResponse,
  PaginatedResult,
  Restaurant,
} from "@food-delivery/types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/axios";

const PAGE_SIZE = 10;

export const restaurantsKeys = {
  list: (search: string) => ["restaurants", "list", search] as const,
  detail: (id: string) => ["restaurants", "detail", id] as const,
};

/** Paginated, searchable restaurant list for customers (infinite scroll). */
export function useRestaurants(search: string) {
  return useInfiniteQuery({
    queryKey: restaurantsKeys.list(search),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ApiResponse<PaginatedResult<Restaurant>>>(
        "/restaurants",
        {
          params: {
            page: pageParam,
            limit: PAGE_SIZE,
            search: search.trim() || undefined,
          },
        },
      );
      return data.data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });
}

/** A single restaurant by id. */
export function useRestaurant(id: string) {
  return useQuery({
    queryKey: restaurantsKeys.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Restaurant>>(
        `/restaurants/${id}`,
      );
      return data.data;
    },
  });
}
