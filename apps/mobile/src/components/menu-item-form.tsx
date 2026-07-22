import type { MenuCategory } from "@food-delivery/types";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";

import Form from "@/components/form/form";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import type { SelectOption } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { PermissionDeniedError, pickAndUploadImage } from "@/lib/upload";

const menuItemSchema = z.object({
  categoryId: z.string().min(1, "Select a category"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z
    .string()
    .min(1, "Price is required")
    .refine(
      (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
      "Enter a valid price",
    ),
  imageUrl: z.union([z.url("Enter a valid URL"), z.literal("")]).optional(),
});

export type MenuItemFormValues = z.infer<typeof menuItemSchema>;

interface MenuItemFormProps {
  categories: MenuCategory[];
  defaultValues?: Partial<MenuItemFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: MenuItemFormValues) => void;
}

export function MenuItemForm({
  categories,
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
}: MenuItemFormProps) {
  const methods = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      categoryId: defaultValues?.categoryId ?? "",
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      price: defaultValues?.price ?? "",
      imageUrl: defaultValues?.imageUrl ?? "",
    },
  });

  const categoryOptions: SelectOption<string>[] = categories.map(
    (category) => ({
      label: category.name,
      value: category.id,
    }),
  );

  const imageUrl = methods.watch("imageUrl");
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    try {
      setIsUploading(true);
      const url = await pickAndUploadImage();
      if (url) {
        methods.setValue("imageUrl", url, { shouldValidate: true });
        toast.success("Image uploaded");
      }
    } catch (error) {
      if (error instanceof PermissionDeniedError) {
        toast.error("Allow photo access to upload an image");
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const submit = methods.handleSubmit((values) => onSubmit(values));

  return (
    <Form {...methods}>
      <FormField
        control={methods.control}
        name="categoryId"
        label="Category"
        fieldType="select"
        placeholder="Select a category"
        options={categoryOptions}
      />
      <FormField
        control={methods.control}
        name="name"
        label="Item name"
        placeholder="Jollof Rice"
        autoCapitalize="words"
        className="mt-5"
      />
      <FormField
        control={methods.control}
        name="price"
        label="Price"
        placeholder="2500"
        keyboardType="numeric"
        className="mt-5"
      />
      <FormField
        control={methods.control}
        name="description"
        label="Description"
        fieldType="textarea"
        placeholder="Tell customers about this item"
        className="mt-5"
      />

      <View className="mt-5">
        <Text className="mb-2 text-sm font-medium text-gray-700">Image</Text>
        {imageUrl ? (
          <View>
            <Image
              source={{ uri: imageUrl }}
              className="h-40 w-full rounded-2xl"
              resizeMode="cover"
            />
            <View className="mt-2 flex-row gap-3">
              <Button
                label="Change"
                variant="outline"
                size="sm"
                loading={isUploading}
                onPress={() => {
                  void pickImage();
                }}
              />
              <Button
                label="Remove"
                variant="ghost"
                size="sm"
                onPress={() => methods.setValue("imageUrl", "")}
              />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              void pickImage();
            }}
            disabled={isUploading}
            className="h-40 items-center justify-center rounded-2xl border border-dashed border-gray-300"
          >
            {isUploading ? (
              <ActivityIndicator color="#16A34A" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={28} color="#9CA3AF" />
                <Text className="mt-2 text-sm text-gray-500">Upload image</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      <Button
        label={isUploading ? "Uploading image…" : submitLabel}
        loading={isSubmitting}
        disabled={isUploading}
        onPress={() => {
          void submit();
        }}
        className="mt-8"
      />
    </Form>
  );
}
