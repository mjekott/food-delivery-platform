import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { toast } from "sonner-native";

import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  placeAutocomplete,
  placeDetails,
  type PlaceDetails,
  type PlacePrediction,
} from "@/lib/places";

interface AddressAutocompleteProps {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onSelect: (place: PlaceDetails) => void;
}

function newSessionToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Google Places address input — returns a formatted address + coordinates. */
export function AddressAutocomplete({
  label,
  value,
  placeholder,
  error,
  onSelect,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionToken = useRef(newSessionToken());
  const debounced = useDebouncedValue(query, 350);

  useEffect(() => {
    if (!open) return;
    if (debounced.trim().length < 3) {
      setPredictions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    placeAutocomplete(debounced, sessionToken.current)
      .then((results) => {
        if (!cancelled) setPredictions(results);
      })
      .catch(() => {
        if (!cancelled) setPredictions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const select = async (prediction: PlacePrediction) => {
    try {
      setLoading(true);
      const details = await placeDetails(prediction.placeId, sessionToken.current);
      setQuery(details.address);
      setOpen(false);
      setPredictions([]);
      sessionToken.current = newSessionToken();
      onSelect(details);
    } catch {
      toast.error("Couldn't load that address. Try another.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Input
        label={label}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setOpen(true);
        }}
        placeholder={placeholder}
        error={error}
        autoCorrect={false}
      />

      {open && (loading || predictions.length > 0) ? (
        <View className="mt-1 overflow-hidden rounded-2xl border border-gray-200">
          {loading ? (
            <View className="items-center py-3">
              <ActivityIndicator color="#16A34A" />
            </View>
          ) : (
            predictions.map((prediction, index) => (
              <Pressable
                key={prediction.placeId}
                onPress={() => {
                  void select(prediction);
                }}
                className={`flex-row items-center px-4 py-3 ${
                  index > 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <Ionicons name="location-outline" size={16} color="#9CA3AF" />
                <Text
                  className="ml-2 flex-1 text-sm text-gray-700"
                  numberOfLines={2}
                >
                  {prediction.description}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}
