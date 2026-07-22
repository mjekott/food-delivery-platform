import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";

import { cn } from "@/lib/cn";

type PasswordInputProps = Omit<TextInputProps, "secureTextEntry"> & {
  label?: string;
  error?: boolean;
  containerClassName?: string;
};

export function PasswordInput({
  label = "Password",
  error,
  className,
  containerClassName,
  ...props
}: PasswordInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      <View
        className={cn(
          "flex-row items-center rounded-2xl border px-4 py-5",
          borderColor,
        )}
      >
        <Text
          className={cn(
            "absolute -top-2.5 left-3 bg-white px-1 text-xs",
            labelColor,
          )}
        >
          {label}
        </Text>
        <TextInput
          {...props}
          secureTextEntry={!showPassword}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          className={cn("flex-1 p-0 text-lg text-black", className)}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        <Pressable onPress={() => setShowPassword((v) => !v)} className="pl-2">
          <Ionicons
            name={showPassword ? "eye-outline" : "eye-off-outline"}
            size={22}
            color="#9CA3AF"
          />
        </Pressable>
      </View>
    </View>
  );
}
