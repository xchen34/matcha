import { useEffect, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";

export function useMatchFilters(currentUser) {
  const [draftFilters, setDraftFilters] = useState({
    username: "",
    min_age: 18,
    max_age: 100,
    min_fame: 0,
    max_fame: 100,
    city: "",
    tags: [],
    sort_by: "",
    sort_dir: "desc",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    username: "",
    min_age: "",
    max_age: "",
    min_fame: "",
    max_fame: "",
    city: "",
    tags: [],
    sort_by: "",
    sort_dir: "desc",
  });

  const [filterError, setFilterError] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityConfirmed, setCityConfirmed] = useState(false);

  /* ========== Fetch city suggestions ========== */
  useEffect(() => {
    let cancelled = false;

    async function fetchCitySuggestions() {
      if (!currentUser) return;
      if (cityConfirmed) return;

      const query = draftFilters.city.trim();
      if (query.length < 2) {
        setCitySuggestions([]);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set("query", query);
        params.set("limit", "8");

        const response = await fetch(
          `/api/profile/city-suggestions?${params.toString()}`,
          {
            headers: buildApiHeaders(currentUser),
          },
        );

        const data = await response.json();

        if (!response.ok || cancelled) {
          return;
        }

        setCitySuggestions(
          Array.isArray(data?.suggestions)
            ? data.suggestions.map((item) => ({
                city: item.city,
                label: item.display_name || item.city,
              }))
            : [],
        );
      } catch {
        if (!cancelled) {
          setCitySuggestions([]);
        }
      }
    }

    const timeoutId = setTimeout(fetchCitySuggestions, 220);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [currentUser, draftFilters.city, cityConfirmed]);

  /* ========== Filter Handlers ========== */
  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilterError("");

    // Handling city: reset confirmation when user type
    if (name === "city") {
      setDraftFilters((prev) => ({ ...prev, city: value }));
      setCityConfirmed(false);
      return;
    }

    // Handling fame rating (allow empty string)
    if (name === "min_fame" || name === "max_fame") {
      if (value === "") {
        setDraftFilters((prev) => ({ ...prev, [name]: "" }));
        return;
      }

      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return;

      setDraftFilters((prev) => ({
        ...prev,
        [name]: String(parsed),
      }));
      return;
    }

    setDraftFilters((prev) => ({ ...prev, [name]: value }));
  }

  /* ========== Slider Handlers ========== */
  function handleAgeSliderChange([min, max]) {
    setDraftFilters((prev) => ({
      ...prev,
      min_age: Math.max(18, Math.round(Number(min))),
      max_age: Math.min(100, Math.round(Number(max))),
    }));
  }

  function handleFameSliderChange([min, max]) {
    setDraftFilters((prev) => ({
      ...prev,
      min_fame: Math.max(0, Math.round(Number(min))),
      max_fame: Math.min(100, Math.round(Number(max))),
    }));
  }

  /* ========== Add/rm Tags ========== */
  function toggleTag(tagName) {
    setDraftFilters((prev) => {
      const exists = prev.tags.includes(tagName);
      return {
        ...prev,
        tags: exists
          ? prev.tags.filter((tag) => tag !== tagName)
          : [...prev.tags, tagName],
      };
    });
  }

  /* ========== Apply a valid city suggestion ========== */
  function applyCitySuggestion(city) {
    setDraftFilters((prev) => ({ ...prev, city }));
    setCityConfirmed(true);
    setCitySuggestions([]);
  }

  /* ========== Apply & Reset Filters ========== */
  async function applyFilters() {
    // Validate age range
    const minAge = draftFilters.min_age ? Number(draftFilters.min_age) : null;
    const maxAge = draftFilters.max_age ? Number(draftFilters.max_age) : null;

    if (minAge !== null && maxAge !== null && minAge > maxAge) {
      setFilterError("Min age cannot be greater than max age");
      return;
    }

    if (minAge !== null && (minAge < 18 || minAge > 150)) {
      setFilterError("Min age must be between 18 and 150");
      return;
    }

    if (maxAge !== null && (maxAge < 18 || maxAge > 150)) {
      setFilterError("Max age must be between 18 and 150");
      return;
    }

    // Validate fame range
    const minFame = draftFilters.min_fame
      ? Number(draftFilters.min_fame)
      : null;
    const maxFame = draftFilters.max_fame
      ? Number(draftFilters.max_fame)
      : null;

    if (minFame !== null && maxFame !== null && minFame > maxFame) {
      setFilterError("Min fame cannot be greater than max fame");
      return;
    }

    if (minFame !== null && (minFame < 0 || minFame > 100)) {
      setFilterError("Min fame must be between 0 and 100");
      return;
    }

    if (maxFame !== null && (maxFame < 0 || maxFame > 100)) {
      setFilterError("Max fame must be between 0 and 100");
      return;
    }

    const nextFilters = {
      ...draftFilters,
    };

    // Validate city against suggestions if not already confirmed
    const city = draftFilters.city.trim();

    if (city) {
      if (!currentUser) return;

      if (!cityConfirmed) {
        try {
          const params = new URLSearchParams();
          params.set("city", city);
          params.set("limit", "5");

          const response = await fetch(
            `/api/profile/validate-location?${params.toString()}`,
            {
              headers: buildApiHeaders(currentUser),
            },
          );

          const data = await response.json();

          if (!response.ok || !data?.validation?.city_exists) {
            setFilterError(
              "Please select a valid city suggestion before searching.",
            );
            return;
          }

          const normalizedCity =
            data?.matched_suggestion?.city ||
            data?.suggestions?.[0]?.city ||
            city;

          setDraftFilters((prev) => ({
            ...prev,
            city: normalizedCity,
          }));

          setAppliedFilters((prev) => ({
            ...prev,
            ...nextFilters,
            city: normalizedCity,
          }));

          setCityConfirmed(true);
          setCitySuggestions([]);
          setFilterError("");

          return;
        } catch {
          setFilterError("Failed to validate city. Please try again.");
          return;
        }
      }
    }

    setAppliedFilters(nextFilters);
    setFilterError("");
  }

  /* ========== Reset all filters to default values ========== */
  function resetFilters() {
    const defaults = {
      username: "",
      min_age: 18,
      max_age: 100,
      min_fame: 0,
      max_fame: 100,
      city: "",
      tags: [],
      sort_by: "",
      sort_dir: "desc",
    };

    setDraftFilters(defaults);
    setAppliedFilters(defaults);
    setCityConfirmed(false);
    setCitySuggestions([]);
    setFilterError("");
  }

  return {
    draftFilters,
    appliedFilters,
    filterError,
    citySuggestions,
    cityConfirmed,
    handleFilterChange,
    handleAgeSliderChange,
    handleFameSliderChange,
    toggleTag,
    applyCitySuggestion,
    applyFilters,
    resetFilters,
    setDraftFilters,
    setAppliedFilters,
    setFilterError,
    setCitySuggestions,
    setCityConfirmed,
  };
}
