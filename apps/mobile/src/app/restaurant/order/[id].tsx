import { useLocalSearchParams } from "expo-router";

import { OrderDetailView } from "@/components/order-detail-view";

export default function RestaurantOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetailView id={id} />;
}
