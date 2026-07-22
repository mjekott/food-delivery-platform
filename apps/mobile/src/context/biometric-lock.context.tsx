import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuth } from "@/context/auth.context";
import { getToken } from "@/lib/auth";
import {
  authenticate,
  getBiometricLabel,
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  type BiometricLabel,
} from "@/lib/biometrics";

interface BiometricLockContextType {
  isLocked: boolean;
  isEnabled: boolean;
  isAvailable: boolean;
  label: BiometricLabel;
  unlock: () => Promise<void>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
}

const BiometricLockContext = createContext<
  BiometricLockContextType | undefined
>(undefined);

export const BiometricLockProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { user, isLoading } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [label, setLabel] = useState<BiometricLabel>("Biometrics");

  // Prevents the biometric prompt's own app-state churn from re-triggering a lock.
  const isAuthenticating = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Cold start: load capability/flag and lock if a session is being restored.
  useEffect(() => {
    void (async () => {
      const [available, enabled, biometricLabel, token] = await Promise.all([
        isBiometricAvailable(),
        isBiometricEnabled(),
        getBiometricLabel(),
        getToken(),
      ]);
      setIsAvailable(available);
      setIsEnabled(enabled);
      setLabel(biometricLabel);
      if (enabled && token) {
        setIsLocked(true);
      }
    })();
  }, []);

  // Resume from background → re-lock (only when a session exists and it's enabled).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      const previous = appState.current;
      appState.current = next;

      if (isAuthenticating.current) return;

      if (previous === "background" && next === "active") {
        void (async () => {
          if ((await isBiometricEnabled()) && (await getToken())) {
            setIsLocked(true);
          }
        })();
      }
    });

    return () => subscription.remove();
  }, []);

  // Genuinely logged out (not just the initial load) → never show the lock, and
  // clear the biometric opt-in so it doesn't leak to the next account on this
  // device. Gating on isLoading avoids wiping the flag during session restore.
  useEffect(() => {
    if (!isLoading && !user) {
      setIsLocked(false);
      setIsEnabled(false);
      void setBiometricEnabled(false);
    }
  }, [user, isLoading]);

  const unlock = useCallback(async () => {
    if (isAuthenticating.current) return;
    isAuthenticating.current = true;
    try {
      const ok = await authenticate(`Unlock with ${label}`);
      if (ok) {
        setIsLocked(false);
      }
    } finally {
      isAuthenticating.current = false;
    }
  }, [label]);

  const enableBiometric = useCallback(async () => {
    const available = await isBiometricAvailable();
    if (!available) return false;

    isAuthenticating.current = true;
    try {
      const currentLabel = await getBiometricLabel();
      const ok = await authenticate(`Enable ${currentLabel}`);
      if (ok) {
        await setBiometricEnabled(true);
        setIsEnabled(true);
        setLabel(currentLabel);
      }
      return ok;
    } finally {
      isAuthenticating.current = false;
    }
  }, []);

  const disableBiometric = useCallback(async () => {
    await setBiometricEnabled(false);
    setIsEnabled(false);
  }, []);

  return (
    <BiometricLockContext.Provider
      value={{
        isLocked,
        isEnabled,
        isAvailable,
        label,
        unlock,
        enableBiometric,
        disableBiometric,
      }}
    >
      {children}
    </BiometricLockContext.Provider>
  );
};

export const useBiometricLock = (): BiometricLockContextType => {
  const context = useContext(BiometricLockContext);
  if (!context) {
    throw new Error(
      "useBiometricLock must be used within a BiometricLockProvider",
    );
  }
  return context;
};
