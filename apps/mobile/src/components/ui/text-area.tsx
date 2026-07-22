import { useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

import { cn } from "@/lib/cn";

type TextAreaProps = Omit<TextInputProps, "multiline"> & {
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

export function TextArea({
  label,
  hint,
  error,
  className,
  containerClassName,
  ...props
}: TextAreaProps) {
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
      <View className={cn("rounded-2xl border px-4 py-2", borderColor)}>
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
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          className={cn("min-h-[120px] p-0 text-base text-black", className)}
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
      {(hint || error) && (
        <Text
          className={cn(
            "mt-1 self-end text-xs",
            error ? "text-red-500" : "text-gray-400",
          )}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}
