import { cva, type VariantProps } from "class-variance-authority";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from "react-native";

import { cn } from "@/lib/cn";

const buttonVariants = cva("flex-row items-center justify-center rounded-xl", {
  variants: {
    variant: {
      default: "bg-black",
      outline: "border border-gray-300 bg-transparent",
      ghost: "bg-transparent",
      destructive: "bg-red-500",
    },
    size: {
      default: "py-4 px-6",
      sm: "py-2 px-4",
      lg: "py-5 px-8",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const buttonTextVariants = cva("font-semibold", {
  variants: {
    variant: {
      default: "text-white",
      outline: "text-black",
      ghost: "text-black",
      destructive: "text-white",
    },
    size: {
      default: "text-base",
      sm: "text-sm",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

type ButtonProps = TouchableOpacityProps &
  VariantProps<typeof buttonVariants> & {
    label: string;
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

export function Button({
  label,
  variant,
  size,
  loading,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className={cn(
        buttonVariants({ variant, size }),
        isDisabled && "opacity-60",
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" || variant === "ghost" ? "#111827" : "#ffffff"
          }
        />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={cn(buttonTextVariants({ variant, size }))}>
            {label}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
