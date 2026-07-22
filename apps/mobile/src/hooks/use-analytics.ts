import type { ApiResponse, RestaurantAnalytics } from "@food-delivery/types";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/axios";

export const analyticsKeys = {
  restaurant: ["analytics", "restaurant"] as const,
};

/** Sales + order analytics for the owner's restaurant. */
export function useRestaurantAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.restaurant,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<RestaurantAnalytics>>(
        "/orders/analytics",
      );
      return data.data;
    },
  });
}
