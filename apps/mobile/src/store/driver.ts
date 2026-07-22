import { create } from "zustand";

/**
 * Driver online state. In-memory (not persisted) so a driver always starts
 * offline on app launch — they must explicitly go online to receive requests.
 */
interface DriverState {
  isOnline: boolean;
  setOnline: (isOnline: boolean) => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  isOnline: false,
  setOnline: (isOnline) => set({ isOnline }),
}));
