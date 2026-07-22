import { useLocalSearchParams } from "expo-router";

import { OrderDetailView } from "@/components/order-detail-view";

export default function CustomerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetailView id={id} />;
}
