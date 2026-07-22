import { ReactNode } from "react";
import {
  Control,
  FieldPath,
  FieldValues,
  useController,
} from "react-hook-form";
import { TextInputProps, View } from "react-native";

import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, type SelectOption } from "@/components/ui/select";
import { TextArea } from "@/components/ui/text-area";

import { FormError } from "./form-error";

interface SharedProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string | ReactNode;
  containerClassName?: string;
  showError?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

type InputFieldProps<T extends FieldValues> = SharedProps<T> &
  TextInputProps & {
    fieldType?: "input";
  };

type PasswordFieldProps<T extends FieldValues> = SharedProps<T> & {
  fieldType: "password";
};

type TextAreaFieldProps<T extends FieldValues> = SharedProps<T> &
  TextInputProps & {
    fieldType: "textarea";
    hint?: string;
  };

type SelectFieldProps<T extends FieldValues> = SharedProps<T> & {
  fieldType: "select";
  options: SelectOption<string>[];
  search?: boolean;
};

type FormFieldProps<T extends FieldValues> =
  | InputFieldProps<T>
  | PasswordFieldProps<T>
  | TextAreaFieldProps<T>
  | SelectFieldProps<T>;

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  containerClassName,
  showError = true,
  className,
  placeholder,
  ...props
}: FormFieldProps<T>) {
  const {
    field: { value, onBlur, onChange },
    fieldState: { error },
  } = useController({ control, name });

  const disabled = (props as SharedProps<T>).disabled;

  const renderField = () => {
    switch (props.fieldType) {
      case "password":
        return (
          <PasswordInput
            label={label as string}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            error={!!error}
            editable={!disabled}
          />
        );
      case "textarea":
        return (
          <TextArea
            {...(props as TextInputProps)}
            label={label as string}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            hint={(props as TextAreaFieldProps<T>).hint}
            error={error?.message}
            editable={!disabled}
          />
        );
      case "select":
        return (
          <Select
            label={label as string}
            value={value as string | undefined}
            onChange={onChange}
            options={(props as SelectFieldProps<T>).options}
            placeholder={placeholder}
            search={(props as SelectFieldProps<T>).search}
            error={error?.message}
          />
        );
      default:
        return (
          <Input
            {...(props as TextInputProps)}
            label={label as string}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            error={error?.message}
            editable={!disabled}
          />
        );
    }
  };

  return (
    <View className={className}>
      {renderField()}
      {showError && props.fieldType !== "select" && !!error?.message && (
        <FormError message={error.message} />
      )}
    </View>
  );
}
