import { router } from "expo-router";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import {
  RestaurantForm,
  type RestaurantFormValues,
} from "@/components/restaurant-form";
import { useCreateRestaurant } from "@/hooks/use-restaurant";
import { getErrorMessage } from "@/lib/get-error-message";
import { posthog } from "@/lib/posthog";

export default function CreateRestaurantScreen() {
  const createRestaurant = useCreateRestaurant();

  const onSubmit = (values: RestaurantFormValues) => {
    createRestaurant.mutate(
      {
        name: values.name.trim(),
        address: values.address.trim(),
        latitude: values.latitude,
        longitude: values.longitude,
        description: values.description?.trim() || undefined,
        imageUrl: values.imageUrl?.trim() || undefined,
      },
      {
        onSuccess: () => {
          posthog.capture("restaurant_created", {
            has_description: !!values.description?.trim(),
            has_image: !!values.imageUrl?.trim(),
          });
          toast.success("Restaurant created");
          router.replace("/restaurant");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerClassName="px-6 py-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-black">Create restaurant</Text>
        <Text className="mt-2 text-base text-gray-500">
          Set up your restaurant to start receiving orders.
        </Text>
        <RestaurantForm
          submitLabel="Create restaurant"
          isSubmitting={createRestaurant.isPending}
          onSubmit={onSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
