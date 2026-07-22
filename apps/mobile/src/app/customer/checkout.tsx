import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { z } from "zod";

import Form from "@/components/form/form";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Button } from "@/components/ui/button";
import { useCreateOrder } from "@/hooks/use-orders";
import { formatNaira } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { posthog } from "@/lib/posthog";
import { useCartStore } from "@/store/cart";

const checkoutSchema = z.object({
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutScreen() {
  const cart = useCartStore((s) => s.cart);
  const subtotal = useCartStore((s) => s.subtotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const createOrder = useCreateOrder();

  const methods = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { deliveryAddress: "" },
  });

  if (!cart) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cart-outline" size={40} color="#D1D5DB" />
          <Text className="mt-3 text-lg font-semibold text-black">
            Your cart is empty
          </Text>
          <Button
            label="Browse restaurants"
            className="mt-6 px-8"
            onPress={() => router.replace("/customer")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const lines = Object.values(cart.lines);

  const submit = methods.handleSubmit((values) => {
    createOrder.mutate(
      {
        restaurantId: cart.restaurantId,
        deliveryAddress: values.deliveryAddress.trim(),
        deliveryLat: values.deliveryLat,
        deliveryLng: values.deliveryLng,
        items: lines.map((l) => ({
          menuItemId: l.item.id,
          quantity: l.quantity,
        })),
      },
      {
        onSuccess: (order) => {
          posthog.capture("order_placed", {
            order_id: order.id,
            restaurant_id: cart.restaurantId,
            total: order.totalAmount,
            item_count: lines.length,
          });
          clearCart();
          toast.success("Order placed");
          router.replace("/customer/orders");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center px-4 pb-2 pt-1">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text className="ml-2 text-xl font-bold text-black">Checkout</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-6 pb-40"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Order summary */}
        <Text className="mb-2 mt-2 text-sm font-semibold text-gray-500">
          {cart.restaurantName}
        </Text>
        <View className="rounded-2xl border border-gray-100">
          {lines.map(({ item, quantity }, index) => (
            <View
              key={item.id}
              className={`flex-row items-center px-4 py-3 ${
                index > 0 ? "border-t border-gray-50" : ""
              }`}
            >
              <Text className="text-sm font-semibold text-gray-700">
                {quantity}×
              </Text>
              <Text
                className="ml-2 flex-1 text-[15px] text-black"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text className="text-[15px] font-medium text-black">
                {formatNaira(String(Number(item.price) * quantity))}
              </Text>
            </View>
          ))}
          <View className="flex-row items-center justify-between border-t border-gray-100 px-4 py-3">
            <Text className="text-base font-semibold text-black">Subtotal</Text>
            <Text className="text-base font-bold text-black">
              {formatNaira(String(subtotal))}
            </Text>
          </View>
        </View>

        {/* Delivery address */}
        <Text className="mb-2 mt-6 text-sm font-semibold text-gray-500">
          Delivery
        </Text>
        <Form {...methods}>
          <AddressAutocomplete
            label="Delivery address"
            value={methods.watch("deliveryAddress")}
            placeholder="Search your delivery address"
            error={methods.formState.errors.deliveryAddress?.message}
            onSelect={(place) => {
              methods.setValue("deliveryAddress", place.address, {
                shouldValidate: true,
              });
              methods.setValue("deliveryLat", place.lat);
              methods.setValue("deliveryLng", place.lng);
            }}
          />
        </Form>
      </ScrollView>

      {/* Place order */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-6 pb-8 pt-4">
        <Button
          label={`Place order · ${formatNaira(String(subtotal))}`}
          loading={createOrder.isPending}
          onPress={() => {
            void submit();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
