import type { MenuItem } from "@food-delivery/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CartLine {
  item: MenuItem;
  quantity: number;
}

/**
 * The single active cart. There is only ever one cart at a time: it belongs to
 * one restaurant (a pending order). Adding an item from a different restaurant
 * replaces the whole cart.
 */
export interface Cart {
  restaurantId: string;
  restaurantName: string;
  restaurantImageUrl: string | null;
  /** Lines keyed by menu-item id. */
  lines: Record<string, CartLine>;
}

export interface RestaurantRef {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface CartState {
  cart: Cart | null;
  /** Total number of items (sum of quantities) in the cart. */
  itemCount: number;
  /** Sum of price × quantity across the cart's lines. */
  subtotal: number;
  /** Adds one of `item`. Replaces the cart if it belongs to another restaurant. */
  addItem: (restaurant: RestaurantRef, item: MenuItem) => void;
  /** Sets `item` to an exact quantity (0 removes it). Replaces cart if needed. */
  setItem: (restaurant: RestaurantRef, item: MenuItem, quantity: number) => void;
  decrement: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
}

/** Recomputes the derived totals from a cart. Single source of truth. */
function derive(cart: Cart | null): Pick<CartState, "cart" | "itemCount" | "subtotal"> {
  const lines = cart ? Object.values(cart.lines) : [];
  return {
    cart,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    subtotal: lines.reduce((sum, l) => sum + Number(l.item.price) * l.quantity, 0),
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,
      itemCount: 0,
      subtotal: 0,

      addItem: (restaurant, item) =>
        set((state) => {
          const { cart } = state;

          // No cart yet, or a cart for a different restaurant → start fresh.
          if (!cart || cart.restaurantId !== restaurant.id) {
            return derive({
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              restaurantImageUrl: restaurant.imageUrl,
              lines: { [item.id]: { item, quantity: 1 } },
            });
          }

          const lines = { ...cart.lines };
          lines[item.id] = {
            item,
            quantity: (lines[item.id]?.quantity ?? 0) + 1,
          };
          return derive({ ...cart, lines });
        }),

      setItem: (restaurant, item, quantity) =>
        set((state) => {
          const qty = Math.max(0, Math.floor(quantity));
          const { cart } = state;

          // Different restaurant → start a fresh cart with just this item.
          if (!cart || cart.restaurantId !== restaurant.id) {
            if (qty <= 0) return state;
            return derive({
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              restaurantImageUrl: restaurant.imageUrl,
              lines: { [item.id]: { item, quantity: qty } },
            });
          }

          const lines = { ...cart.lines };
          if (qty <= 0) {
            delete lines[item.id];
          } else {
            lines[item.id] = { item, quantity: qty };
          }

          if (Object.keys(lines).length === 0) return derive(null);
          return derive({ ...cart, lines });
        }),

      decrement: (itemId) =>
        set((state) => {
          const { cart } = state;
          const line = cart?.lines[itemId];
          if (!cart || !line) return state;

          const lines = { ...cart.lines };
          if (line.quantity <= 1) {
            delete lines[itemId];
          } else {
            lines[itemId] = { ...line, quantity: line.quantity - 1 };
          }

          if (Object.keys(lines).length === 0) return derive(null);
          return derive({ ...cart, lines });
        }),

      removeItem: (itemId) =>
        set((state) => {
          const { cart } = state;
          if (!cart) return state;

          const lines = { ...cart.lines };
          delete lines[itemId];

          if (Object.keys(lines).length === 0) return derive(null);
          return derive({ ...cart, lines });
        }),

      clearCart: () => set(derive(null)),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only the cart is persisted; totals are re-derived on rehydrate.
      partialize: (state) => ({ cart: state.cart }),
      onRehydrateStorage: () => (state) => {
        if (state) Object.assign(state, derive(state.cart));
      },
    },
  ),
);
