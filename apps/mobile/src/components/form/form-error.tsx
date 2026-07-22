import { Text } from "react-native";

export function FormError({ message = "" }: { message?: string }) {
  return <Text className="mt-1.5 text-sm text-red-500">{message}</Text>;
}
