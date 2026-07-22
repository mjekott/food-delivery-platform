// Google Places (legacy web REST) — called directly from the app; native fetch
// has no CORS. Key is exposed to the client, so restrict it by bundle id / SHA
// in Google Cloud.
const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const BASE = "https://maps.googleapis.com/maps/api/place";

export interface PlacePrediction {
  description: string;
  placeId: string;
}

export interface PlaceDetails {
  address: string;
  lat: number;
  lng: number;
}

interface AutocompleteResponse {
  status: string;
  error_message?: string;
  predictions?: { description: string; place_id: string }[];
}

interface DetailsResponse {
  status: string;
  error_message?: string;
  result?: {
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  };
}

/** Address predictions for the typed input. Empty for short input / no key. */
export async function placeAutocomplete(
  input: string,
  sessionToken: string,
): Promise<PlacePrediction[]> {
  if (!KEY || input.trim().length < 3) return [];

  const params = new URLSearchParams({
    input: input.trim(),
    key: KEY,
    sessiontoken: sessionToken,
    components: "country:ng",
  });
  const res = await fetch(`${BASE}/autocomplete/json?${params.toString()}`);
  const json = (await res.json()) as AutocompleteResponse;

  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    throw new Error(json.error_message ?? json.status);
  }
  return (json.predictions ?? []).map((p) => ({
    description: p.description,
    placeId: p.place_id,
  }));
}

/** Resolves a prediction to a formatted address + coordinates. */
export async function placeDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceDetails> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: KEY,
    sessiontoken: sessionToken,
    fields: "geometry,formatted_address",
  });
  const res = await fetch(`${BASE}/details/json?${params.toString()}`);
  const json = (await res.json()) as DetailsResponse;

  if (json.status !== "OK" || !json.result) {
    throw new Error(json.error_message ?? json.status);
  }
  return {
    address: json.result.formatted_address,
    lat: json.result.geometry.location.lat,
    lng: json.result.geometry.location.lng,
  };
}
