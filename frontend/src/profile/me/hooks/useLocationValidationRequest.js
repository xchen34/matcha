import { useCallback, useRef, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";
import { getValidationCacheKey } from "@/utils/locationUtils.js";

export default function useLocationValidationRequest({ userId, form, setMessage }) {
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationValidation, setLocationValidation] = useState(null);
  const [validatingLocation, setValidatingLocation] = useState(false);

  const validationCacheRef = useRef(new Map());
  const latestValidationRequestRef = useRef(0);

  const validateLocationInput = useCallback(
    async (options = {}) => {
      const { silent = false } = options;
      if (!userId) {
        if (!silent) setMessage("Please login first.");
        return;
      }

      const city = (form.city || "").trim();
      const neighborhood = (form.neighborhood || "").trim();
      const latitude = (form.latitude || "").trim();
      const longitude = (form.longitude || "").trim();

      /* Generate cache key and check for cached validation result */
      const cacheKey = getValidationCacheKey(city, neighborhood, latitude, longitude);
      const cached = validationCacheRef.current.get(cacheKey);
      if (cached) {
        setLocationValidation(cached.validation || null);
        setLocationSuggestions(cached.suggestions || []);
        return;
      }

      if (!city && !neighborhood && (!latitude || !longitude)) {
        if (!silent) {
          setMessage("Enter city/neighborhood or coordinates before verification.");
        }
        return;
      }

      setValidatingLocation(true);
      if (!silent) setMessage("Checking location...");

      /* Increment request ID to track the latest validation request */
      const requestId = latestValidationRequestRef.current + 1;
      latestValidationRequestRef.current = requestId;

      /* Build query parameters for validation API */
      const params = new URLSearchParams();
      if (city) params.set("city", city);
      if (neighborhood) params.set("neighborhood", neighborhood);
      if (latitude) params.set("latitude", latitude);
      if (longitude) params.set("longitude", longitude);
      params.set("limit", "5");

      try {
        const response = await fetch(
          `/api/profile/validate-location?${params.toString()}`,
          { headers: buildApiHeaders({ id: userId }) },
        );
        const data = await response.json();

        if (requestId !== latestValidationRequestRef.current) return;

        if (!response.ok) {
          setLocationValidation(null);
          setLocationSuggestions([]);
          if (!silent) {
            setMessage(`Error: ${data.error || "Location verification failed"}`);
          }
          return;
        }

        const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
        setLocationValidation(data.validation || null);
        setLocationSuggestions(suggestions);
        
        /* Cache the validation result and suggestions */
        validationCacheRef.current.set(cacheKey, {
          validation: data.validation || null,
          suggestions,
        });

        if (!silent) {
          setMessage(
            data.validation?.is_valid
              ? "Location verified. You can save safely."
              : "Location needs confirmation. Choose a suggestion or adjust your input.",
          );
        }
      } catch (error) {
        if (requestId !== latestValidationRequestRef.current) return;
        
        setLocationValidation(null);
        setLocationSuggestions([]);
        
        if (!silent) setMessage(`Error: ${error.message}`);
      } finally {
        if (requestId === latestValidationRequestRef.current) {
          setValidatingLocation(false);
        }
      }
    },
    [form.city, form.latitude, form.longitude, form.neighborhood, setMessage, userId],
  );

  return {
    locationSuggestions,
    setLocationSuggestions,
    locationValidation,
    setLocationValidation,
    validatingLocation,
    validateLocationInput,
  };
}
