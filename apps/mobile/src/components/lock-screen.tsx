import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth.context";
import { useBiometricLock } from "@/context/biometric-lock.context";

function LockScreen() {
  const { unlock, label } = useBiometricLock();
  const { logout } = useAuth();
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (hasPrompted.current) return;
    hasPrompted.current = true;
    void unlock();
  }, [unlock]);

  return (
    <SafeAreaView className="absolute inset-0 z-50 flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="lock-closed" size={56} color="#16A34A" />
        <Text className="mt-6 text-2xl font-bold text-black">App locked</Text>
        <Text className="mt-2 text-center text-gray-500">
          Unlock with {label} to continue.
        </Text>
        <Button
          label={`Unlock with ${label}`}
          onPress={() => void unlock()}
          className="mt-8 w-full"
        />
      </View>
      <View className="px-8 pb-8">
        <Button
          label="Log out"
          variant="ghost"
          onPress={() => void logout()}
        />
      </View>
    </SafeAreaView>
  );
}

/** Renders the lock screen over the app when a logged-in session is locked. */
export function BiometricLockOverlay() {
  const { user, isLoading } = useAuth();
  const { isLocked } = useBiometricLock();

  if (isLoading || !user || !isLocked) {
    return null;
  }

  return <LockScreen />;
}
