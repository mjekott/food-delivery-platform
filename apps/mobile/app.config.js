export default {
  expo: {
    name: "Food Delivery",
    slug: "food-delivery",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "fooddelivery",
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/expo.icon",
      bundleIdentifier: "com.mjekott.fooddelivery",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      package: "com.mjekott.fooddelivery",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT",
      ],
      // react-native-maps needs a Google Maps key on Android (iOS uses Apple Maps).
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76,
          },
        },
      ],
      [
        "expo-local-authentication",
        {
          faceIDPermission:
            "Allow $(PRODUCT_NAME) to unlock the app with Face ID.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow $(PRODUCT_NAME) to access your photos to upload restaurant images.",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to use your location to find nearby restaurants and track deliveries.",
          locationAlwaysAndWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to use your location to track deliveries in real time.",
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "03c9151b-7d56-41b3-8990-54b14d41b0e8",
      },
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost:
        process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    },
  },
};
