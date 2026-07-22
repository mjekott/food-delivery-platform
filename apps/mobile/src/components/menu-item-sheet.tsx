import type { MenuItem } from "@food-delivery/types";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { type RestaurantRef, useCartStore } from "@/store/cart";

export interface MenuItemSheetRef {
  present: (item: MenuItem) => void;
  dismiss: () => void;
}

/**
 * Item detail bottom sheet: full-bleed image, name/description/price, a quantity
 * stepper and an "Add to cart" action. Opening it for an item already in the
 * cart pre-fills its current quantity.
 */
export const MenuItemSheet = forwardRef<
  MenuItemSheetRef,
  { restaurant: RestaurantRef }
>(function MenuItemSheet({ restaurant }, ref) {
  const modalRef = useRef<BottomSheetModal>(null);
  const setItem = useCartStore((s) => s.setItem);
  const [item, setItemState] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const committedQty = useCartStore((s) =>
    item && s.cart?.restaurantId === restaurant.id
      ? (s.cart.lines[item.id]?.quantity ?? 0)
      : 0,
  );

  useImperativeHandle(ref, () => ({
    present: (next) => {
      const { cart } = useCartStore.getState();
      const existing =
        cart?.restaurantId === restaurant.id
          ? (cart.lines[next.id]?.quantity ?? 0)
          : 0;
      setItemState(next);
      setQuantity(existing > 0 ? existing : 1);
      modalRef.current?.present();
    },
    dismiss: () => modalRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const onAdd = () => {
    if (!item) return;
    setItem(restaurant, item, quantity);
    modalRef.current?.dismiss();
    toast.success(committedQty > 0 ? "Cart updated" : `${item.name} added`);
  };

  const lineTotal = item ? Number(item.price) * quantity : 0;

  return (
    <BottomSheetModal
      ref={modalRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: "#D1D5DB" }}
      backgroundStyle={{ borderRadius: 24 }}
    >
      <BottomSheetView>
        {item ? (
          <View className="px-5 pb-8 pt-1">
            <View className="flex-row items-start justify-between">
              <Text className="flex-1 pr-3 text-xl font-bold text-black">
                {item.name}
              </Text>
              <Pressable
                onPress={() => modalRef.current?.dismiss()}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
            </View>

            {item.description ? (
              <Text className="mt-1 text-sm leading-5 text-gray-500">
                {item.description}
              </Text>
            ) : null}
            <Text className="mt-3 text-lg font-bold text-black">
              {formatNaira(item.price)}
            </Text>

            <View className="mt-6 flex-row items-center">
              <View className="flex-row items-center rounded-2xl border border-gray-200">
                <Pressable
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  hitSlop={6}
                  className="h-12 w-12 items-center justify-center"
                >
                  <Ionicons name="remove" size={20} color="#111827" />
                </Pressable>
                <Text className="w-8 text-center text-base font-bold text-black">
                  {quantity}
                </Text>
                <Pressable
                  onPress={() => setQuantity((q) => q + 1)}
                  hitSlop={6}
                  className="h-12 w-12 items-center justify-center"
                >
                  <Ionicons name="add" size={20} color="#111827" />
                </Pressable>
              </View>
              <View className="ml-3 flex-1">
                <Button
                  label={
                    !item.isAvailable
                      ? "Sold out"
                      : committedQty > 0
                        ? `Update cart · ${formatNaira(String(lineTotal))}`
                        : `Add to cart · ${formatNaira(String(lineTotal))}`
                  }
                  disabled={!item.isAvailable}
                  onPress={onAdd}
                />
              </View>
            </View>
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});
