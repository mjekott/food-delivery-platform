import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";

import Form from "@/components/form/form";
import { FormField } from "@/components/form/form-field";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { PermissionDeniedError, pickAndUploadImage } from "@/lib/upload";

const restaurantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  imageUrl: z.union([z.url("Enter a valid URL"), z.literal("")]).optional(),
});

export type RestaurantFormValues = z.infer<typeof restaurantSchema>;

interface RestaurantFormProps {
  defaultValues?: Partial<RestaurantFormValues>;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: RestaurantFormValues) => void;
}

export function RestaurantForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
}: RestaurantFormProps) {
  const methods = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      address: defaultValues?.address ?? "",
      latitude: defaultValues?.latitude,
      longitude: defaultValues?.longitude,
      description: defaultValues?.description ?? "",
      imageUrl: defaultValues?.imageUrl ?? "",
    },
  });

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
        name="name"
        label="Restaurant name"
        placeholder="Mama Put"
        autoCapitalize="words"
      />
      <View className="mt-5">
        <AddressAutocomplete
          label="Address"
          value={methods.watch("address")}
          placeholder="Search your restaurant address"
          error={methods.formState.errors.address?.message}
          onSelect={(place) => {
            methods.setValue("address", place.address, {
              shouldValidate: true,
            });
            methods.setValue("latitude", place.lat);
            methods.setValue("longitude", place.lng);
          }}
        />
      </View>
      <FormField
        control={methods.control}
        name="description"
        label="Description"
        fieldType="textarea"
        placeholder="Tell customers about your restaurant"
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
                <Ionicons
                  name="cloud-upload-outline"
                  size={28}
                  color="#9CA3AF"
                />
                <Text className="mt-2 text-sm text-gray-500">Upload image</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      <Button
        label={submitLabel}
        loading={isSubmitting}
        onPress={() => {
          void submit();
        }}
        className="mt-8"
      />
    </Form>
  );
}
