import { ReactNode, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";

import { cn } from "@/lib/cn";

export type SelectOption<V extends string> = {
  label: string;
  value: V;
  icon?: ReactNode;
};

type SelectProps<V extends string> = {
  label: string;
  value?: V;
  onChange: (value: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  error?: string;
  search?: boolean;
  /** Static leading icon for the field (overrides the selected option's icon). */
  leftIcon?: ReactNode;
  containerClassName?: string;
};

export function Select<V extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = "Select",
  error,
  search = false,
  leftIcon,
  containerClassName,
}: SelectProps<V>) {
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

  const selectedOption = options.find((option) => option.value === value);
  const fieldIcon = leftIcon ?? selectedOption?.icon;

  return (
    <View className={cn("mt-2", containerClassName)}>
      <View className={cn("rounded-2xl border", borderColor)}>
        <Text
          className={cn(
            "absolute -top-2.5 left-3 z-10 bg-white px-1 text-xs",
            labelColor,
          )}
        >
          {label}
        </Text>
        <Dropdown
          data={options}
          labelField="label"
          valueField="value"
          value={value}
          onChange={(item) => onChange((item as SelectOption<V>).value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          search={search}
          maxHeight={300}
          style={styles.dropdown}
          placeholderStyle={styles.placeholder}
          selectedTextStyle={styles.selectedText}
          inputSearchStyle={styles.search}
          containerStyle={styles.list}
          renderLeftIcon={
            fieldIcon ? () => <View style={styles.leftIcon}>{fieldIcon}</View> : undefined
          }
          renderItem={(item, selected) => {
            const option = item as SelectOption<V>;
            return (
              <View style={[styles.item, selected && styles.itemSelected]}>
                {option.icon ? (
                  <View style={styles.itemIcon}>{option.icon}</View>
                ) : null}
                <Text style={styles.itemText}>{option.label}</Text>
              </View>
            );
          }}
        />
      </View>
      {!!error && <Text className="mt-1.5 text-sm text-red-500">{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: { height: 56, paddingHorizontal: 16 },
  placeholder: { fontSize: 18, color: "#9CA3AF" },
  selectedText: { fontSize: 18, color: "#000000" },
  search: { height: 44, fontSize: 16, borderRadius: 12 },
  list: { borderRadius: 16 },
  leftIcon: { marginRight: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemSelected: { backgroundColor: "#F3F4F6" },
  itemIcon: { marginRight: 10 },
  itemText: { fontSize: 16, color: "#111827" },
});
