import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import {
  RestaurantForm,
  type RestaurantFormValues,
} from "@/components/restaurant-form";
import { useMyRestaurant, useUpdateRestaurant } from "@/hooks/use-restaurant";
import { getErrorMessage } from "@/lib/get-error-message";
import { posthog } from "@/lib/posthog";

export default function EditRestaurantScreen() {
  const { data: restaurant } = useMyRestaurant();
  const updateRestaurant = useUpdateRestaurant();

  if (!restaurant) {
    return <Redirect href="/restaurant" />;
  }

  const onSubmit = (values: RestaurantFormValues) => {
    updateRestaurant.mutate(
      {
        id: restaurant.id,
        input: {
          name: values.name.trim(),
          address: values.address.trim(),
          latitude: values.latitude,
          longitude: values.longitude,
          description: values.description?.trim() || undefined,
          imageUrl: values.imageUrl?.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          posthog.capture("restaurant_updated", {
            restaurant_id: restaurant.id,
            has_description: !!values.description?.trim(),
            has_image: !!values.imageUrl?.trim(),
          });
          toast.success("Restaurant updated");
          router.back();
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
        <Pressable
          onPress={() => router.back()}
          className="mb-4 flex-row items-center self-start"
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
          <Text className="ml-1 text-base text-black">Back</Text>
        </Pressable>

        <Text className="text-3xl font-bold text-black">Edit restaurant</Text>
        <Text className="mt-2 text-base text-gray-500">
          Update your restaurant details.
        </Text>
        <RestaurantForm
          defaultValues={{
            name: restaurant.name,
            address: restaurant.address,
            latitude: restaurant.latitude ?? undefined,
            longitude: restaurant.longitude ?? undefined,
            description: restaurant.description ?? "",
            imageUrl: restaurant.imageUrl ?? "",
          }}
          submitLabel="Save changes"
          isSubmitting={updateRestaurant.isPending}
          onSubmit={onSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
