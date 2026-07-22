import { useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

import { cn } from "@/lib/cn";

type InputProps = TextInputProps & {
  label: string;
  error?: string;
  containerClassName?: string;
};

export function Input({
  label,
  error,
  className,
  containerClassName,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? "border-red-500"
    : focused
      ? "border-gray-900"
      : "border-gray-300";
  const labelColor = error
    ? "text-red-500"
    : focused
      ? "text-gray-900"
      : "text-gray-600";

  return (
    <View className={cn("mt-2", containerClassName)}>
      <View className={cn("rounded-2xl border px-4 py-5", borderColor)}>
        <Text
          className={cn(
            "absolute -top-2.5 left-3 bg-white px-1 text-xs",
            labelColor,
          )}
        >
          {label}
        </Text>
        <TextInput
          placeholderTextColor="#9CA3AF"
          className={cn("p-0 text-lg text-black", className)}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
      </View>
    </View>
  );
}
