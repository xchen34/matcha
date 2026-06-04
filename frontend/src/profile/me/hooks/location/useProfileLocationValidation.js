import { useEffect, useMemo, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";
import { normalizeLocationPrefix } from "@/utils/locationUtils.js";
import useCityNeighborhoodOptions from "./useCityNeighborhoodOptions";
import useLocationValidationRequest from "./useLocationValidationRequest";

export default function useProfileLocationValidation({
  userId,
  form,
  setForm,
  setMessage,
}) {
  /* ========== State ========== */
  const [citySearchSuggestions, setCitySearchSuggestions] = useState([]);
  const [isCitySuggestionsOpen, setIsCitySuggestionsOpen] = useState(false);
  const [isNeighborhoodSelected, setIsNeighborhoodSelected] = useState(false);
  const [isCityConfirmed, setIsCityConfirmed] = useState(false);

  /* ========== Determine if city input exists for conditional logic ========== */
  const hasCityInput = (form.city || "").trim().length > 0;

  /* ========== Hook for validating location input and managing related state ========== */
  const {
    locationSuggestions,
    setLocationSuggestions,
    locationValidation,
    setLocationValidation,
    validatingLocation,
    validateLocationInput,
  } = useLocationValidationRequest({ userId, form, setMessage });

  const isLocationAccepted =
    Boolean(locationValidation?.city_exists) || isCityConfirmed;

  const isCitySelected =
    (form.city || "").trim().length > 0 &&
    (isCityConfirmed ||
      (!validatingLocation && Boolean(locationValidation?.city_exists)));

  /* ========== Hook for fetching neighborhood options based on selected city ========== */
  const {
    cityNeighborhoodOptions,
    loadingNeighborhoods,
    setCityNeighborhoodOptions,
  } = useCityNeighborhoodOptions({
    userId,
    form,
    hasCityInput,
    isCitySelected,
  });

  /* ========== Memoized city suggestion options ========== */
  const citySuggestionOptions = useMemo(() => {
    const sourceSuggestions =
      citySearchSuggestions.length > 0
        ? citySearchSuggestions
        : locationSuggestions;

    return sourceSuggestions
      .filter((item) => (item.city || "").trim().length > 0)
      .map((item) => ({
        key: `${item.city || ""}-${item.display_name || ""}-${item.latitude ?? ""}-${item.longitude ?? ""}`,
        city: item.city,
        neighborhood: item.neighborhood || "",
        label: item.display_name,
      }));
  }, [citySearchSuggestions, locationSuggestions]);

  const cityAutocompleteOptions = useMemo(() => {
    const prefix = normalizeLocationPrefix(form.city);
    if (!prefix) return [];

    return citySuggestionOptions
      .filter((item) => {
        const normalizedCity = normalizeLocationPrefix(item.city);
        return (
          normalizedCity.startsWith(prefix) || normalizedCity.includes(prefix)
        );
      })
      .slice(0, 12);
  }, [citySuggestionOptions, form.city]);

  /* ========== Memoized neighborhood suggestions for the selected city (avoid double suggestions) ========== */
  const neighborhoodByCitySuggestions = useMemo(() => {
    const selectedCity = normalizeLocationPrefix(form.city);
    if (!selectedCity) return [];

    const byNeighborhood = new Map();
    for (const item of locationSuggestions) {
      const itemCity = normalizeLocationPrefix(item.city);
      const itemNeighborhood = (item.neighborhood || "").trim();
      if (!itemNeighborhood || itemCity !== selectedCity) continue;

      const neighborhoodKey = normalizeLocationPrefix(itemNeighborhood);
      if (!byNeighborhood.has(neighborhoodKey)) {
        byNeighborhood.set(neighborhoodKey, {
          value: itemNeighborhood,
          label: `${itemNeighborhood} - ${item.display_name}`,
        });
      }
    }

    return Array.from(byNeighborhood.values())
      .sort((a, b) =>
        a.value.localeCompare(b.value, undefined, { sensitivity: "base" }),
      )
      .slice(0, 20);
  }, [locationSuggestions, form.city]);

  const neighborhoodByCityOptions =
    cityNeighborhoodOptions.length > 0
      ? cityNeighborhoodOptions
      : neighborhoodByCitySuggestions;

  /* ============ Effect to fetch city suggestions based on city input ============ */
  useEffect(() => {
    let cancelled = false;

    async function fetchCitySuggestions() {
      if (!userId) {
        return setCitySearchSuggestions([]);
      }

      const city = (form.city || "").trim();
      if (city.length < 2) {
        return setCitySearchSuggestions([]);
      }

      try {
        const params = new URLSearchParams();
        params.set("query", city);
        params.set("limit", "20");

        const response = await fetch(
          `/api/profile/city-suggestions?${params.toString()}`,
          {
            headers: buildApiHeaders({
              id: userId,
            }),
          },
        );

        const data = await response.json();
        if (!response.ok || cancelled) {
          if (!cancelled) {
            setMessage(
              `City suggestions unavailable (${response.status}). ${data?.error || "Check backend logs."}`,
            );
          }
          return;
        }

        const suggestions = Array.isArray(data.suggestions)
          ? data.suggestions.map((item) => ({
              city: item.city,
              neighborhood: "",
              display_name: item.display_name || item.city,
            }))
          : [];

        if (!cancelled) {
          setCitySearchSuggestions(suggestions);
        }
      } catch {
        if (!cancelled) {
          setCitySearchSuggestions([]);
          setMessage("City suggestions failed. Check backend availability.");
        }
      }
    }

    const timeoutId = setTimeout(fetchCitySuggestions, 220);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [userId, form.city, setMessage]);

  /* ============ Effect to validate location input when relevant fields change ============ */
  useEffect(() => {
    if (!userId) return undefined;

    const city = (form.city || "").trim();
    const neighborhood = (form.neighborhood || "").trim();
    const latitude = (form.latitude || "").trim();
    const longitude = (form.longitude || "").trim();

    if (!city && !neighborhood) {
      setLocationValidation(null);
      setLocationSuggestions([]);

      return undefined;
    }

    if (city && !neighborhood && !latitude && !longitude && isCityConfirmed) {
      return undefined;
    }

    const handle = setTimeout(() => {
      validateLocationInput({ silent: true });
    }, 900);

    return () => clearTimeout(handle);
  }, [
    userId,
    form.city,
    form.neighborhood,
    form.latitude,
    form.longitude,
    form.gps_consent,
    isCityConfirmed,
    validateLocationInput,
    setLocationSuggestions,
    setLocationValidation,
  ]);

  /* ============ Handlers for applying city suggestions and editing location ============ */
  function applyCitySuggestion(option) {
    setForm((prev) => ({
      ...prev,
      city: option.city,
      neighborhood: "",
    }));
    setIsCityConfirmed(true);
    
    setLocationValidation((prev) => ({
      ...(prev || {}),
      is_valid: true,
      city_exists: true,
      neighborhood_exists: true,
      matched_exact_suggestion: true,
    }));

    setCityNeighborhoodOptions([]);
    setCitySearchSuggestions([]);
    setIsNeighborhoodSelected(false);
    setIsCitySuggestionsOpen(false);
    setMessage(
      "City suggestion selected. Choose a neighborhood if you want to be more specific.",
    );
  }

  /* =========== Handler for editing location to reset related fields and validation ============ */
  function handleEditLocation() {
    setForm((prev) => ({
      ...prev,
      neighborhood: "",
      gps_consent: false,
      latitude: "",
      longitude: "",
    }));

    setIsCityConfirmed(false);
    setCityNeighborhoodOptions([]);
    setLocationValidation(null);
    setIsNeighborhoodSelected(false);
    setMessage("Edit your city if needed.");
  }

  /* ============ Handler for city input change to manage suggestions and validation ============ */
  function handleCityInputChange(event, handleChange) {
    handleChange(event);
    if (!isNeighborhoodSelected) {
      setIsCitySuggestionsOpen(true);
    }

    const typed = normalizeLocationPrefix(event.target.value);
    if (!typed) return;

    const matched = citySuggestionOptions.find(
      (item) => normalizeLocationPrefix(item.city) === typed,
    );
    if (matched) {
      applyCitySuggestion(matched);
    }
  }

  return {
    // States and flags
    hasCityInput,
    isLocationAccepted,
    isCitySelected,
    isCitySuggestionsOpen,
    isNeighborhoodSelected,
    isCityConfirmed,
    validatingLocation,
    loadingNeighborhoods,
    locationValidation,

    // Options
    cityAutocompleteOptions,
    neighborhoodByCityOptions,

    // Handlers
    handleCityInputChange,
    applyCitySuggestion,
    handleEditLocation,

    // Setters / state updaters
    setIsCitySuggestionsOpen,
    setIsNeighborhoodSelected,
    setIsCityConfirmed,
    setLocationValidation,
    setLocationSuggestions,
    setCitySearchSuggestions,
    setCityNeighborhoodOptions,
  };
}
