import { useAuth } from "@/context/auth.context";
import { UserRole } from "@food-delivery/types";
import { Redirect } from "expo-router";

export default function HomeScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) return <Redirect href="/(auth)/login" />;

  if (user.role === UserRole.CUSTOMER) return <Redirect href="/customer" />;

  if (user.role === UserRole.RESTAURANT_OWNER)
    return <Redirect href="/restaurant" />;

  if (user.role === UserRole.DRIVER) return <Redirect href="/driver" />;
  return <Redirect href="/(auth)/login" />;
}
