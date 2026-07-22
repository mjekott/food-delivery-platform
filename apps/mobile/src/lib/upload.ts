import type { ApiResponse } from "@food-delivery/types";
import * as ImagePicker from "expo-image-picker";

import { api } from "@/lib/axios";

export class PermissionDeniedError extends Error {
  constructor() {
    super("Photo library permission denied");
    this.name = "PermissionDeniedError";
  }
}

/**
 * Opens the photo library, uploads the chosen image to the API (which proxies
 * to UploadThing), and returns the hosted URL. Returns null if the user cancels.
 */
export async function pickAndUploadImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PermissionDeniedError();
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const formData = new FormData();
  formData.append("file", {
    uri: asset.uri,
    name: asset.fileName ?? `image-${Date.now()}.jpg`,
    type: asset.mimeType ?? "image/jpeg",
  } as unknown as Blob);

  const { data } = await api.post<ApiResponse<{ url: string }>>(
    "/uploads/image",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  return data.data.url;
}
