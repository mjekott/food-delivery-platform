import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenPlaceholderProps = {
  title: string;
  subtitle?: string;
};

export function ScreenPlaceholder({ title, subtitle }: ScreenPlaceholderProps) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-black">{title}</Text>
        {subtitle ? (
          <Text className="mt-2 text-center text-gray-500">{subtitle}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
