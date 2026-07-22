import { Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth.context";
import { useBiometricLock } from "@/context/biometric-lock.context";
import { posthog } from "@/lib/posthog";

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const { isAvailable, isEnabled, label, enableBiometric, disableBiometric } =
    useBiometricLock();

  const onToggleBiometric = async (next: boolean) => {
    if (next) {
      const ok = await enableBiometric();
      if (!ok) {
        toast.error(`Could not enable ${label}`);
      } else {
        posthog.capture("biometric_lock_enabled", { biometric_type: label });
      }
    } else {
      await disableBiometric();
      posthog.capture("biometric_lock_disabled", { biometric_type: label });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-8">
        <Text className="text-3xl font-bold text-black">Profile</Text>

        <View className="mt-8 gap-1">
          <Text className="text-xl font-semibold text-black">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-gray-500">{user?.email}</Text>
          <Text className="mt-1 text-sm text-gray-400">{user?.role}</Text>
        </View>

        {isAvailable && (
          <View className="mt-8 flex-row items-center justify-between rounded-2xl border border-gray-200 px-4 py-4">
            <View className="flex-1 pr-4">
              <Text className="text-base font-medium text-black">
                Unlock with {label}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-500">
                Require {label} each time the app opens.
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={(next) => {
                void onToggleBiometric(next);
              }}
              trackColor={{ true: "#16A34A" }}
            />
          </View>
        )}

        <View className="mt-auto">
          <Button
            label="Log out"
            variant="destructive"
            onPress={() => {
              void logout();
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
