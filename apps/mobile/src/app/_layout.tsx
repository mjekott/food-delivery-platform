import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { BiometricLockOverlay } from "@/components/lock-screen";
import { AuthProvider, useAuth } from "@/context/auth.context";
import { BiometricLockProvider } from "@/context/biometric-lock.context";
import { posthog } from "@/lib/posthog";
import { UserRole } from "@food-delivery/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PostHogProvider } from "posthog-react-native";
import { Toaster } from "sonner-native";
import "../global.css";

const queryClient = new QueryClient();

const ScreenTracker = () => {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  return null;
};

const RootNavigator = () => {
  const { isLoading, user } = useAuth();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
      </Stack.Protected>

      <Stack.Protected guard={!!user && user.role === UserRole.CUSTOMER}>
        <Stack.Screen name="customer" />
      </Stack.Protected>

      <Stack.Protected
        guard={!!user && user.role === UserRole.RESTAURANT_OWNER}
      >
        <Stack.Screen name="restaurant" />
      </Stack.Protected>

      <Stack.Protected guard={!!user && user.role === UserRole.DRIVER}>
        <Stack.Screen name="driver" />
      </Stack.Protected>
    </Stack>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <QueryClientProvider client={queryClient}>
          <PostHogProvider
            client={posthog}
            autocapture={{
              captureScreens: false,
              captureTouches: true,
              propsToCapture: ["testID"],
              maxElementsCaptured: 20,
            }}
          >
            <AuthProvider>
              <BiometricLockProvider>
                <BottomSheetModalProvider>
                  <ScreenTracker />
                  <AnimatedSplashOverlay />
                  <RootNavigator />
                  <BiometricLockOverlay />
                  <Toaster />
                </BottomSheetModalProvider>
              </BiometricLockProvider>
            </AuthProvider>
          </PostHogProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
