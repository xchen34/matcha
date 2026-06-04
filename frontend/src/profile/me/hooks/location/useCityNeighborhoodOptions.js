import { useEffect, useRef, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";
import { normalizeLocationPrefix } from "@/utils/locationUtils.js";

export default function useCityNeighborhoodOptions({
  userId,
  form,
  hasCityInput,
  isCitySelected,
}) {
  const [cityNeighborhoodOptions, setCityNeighborhoodOptions] = useState([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const cityNeighborhoodCacheRef = useRef(new Map());

  useEffect(() => {
    let cancelled = false;

    async function loadCityNeighborhoods() {
      /* ========== Check prerequisites ========== */
      if (!userId || !hasCityInput || !isCitySelected) {
        setCityNeighborhoodOptions([]);
        setLoadingNeighborhoods(false);
        return;
      }

      /* ========== Check cache first ========== */
      const cityCacheKey = normalizeLocationPrefix(form.city);
      const cached = cityNeighborhoodCacheRef.current.get(cityCacheKey);
      if (cached) {
        setCityNeighborhoodOptions(cached);
        setLoadingNeighborhoods(false);
        return;
      }

      /* ========== API request to fetch neighborhoods for the selected city (20 results) ========== */
      try {
        setLoadingNeighborhoods(true);

        const params = new URLSearchParams();
        params.set("city", form.city.trim());
        params.set("limit", "20");

        const response = await fetch(
          `/api/profile/city-neighborhoods?${params.toString()}`,
          {
            headers: buildApiHeaders({
              id: userId,
            }),
          },
        );

        const data = await response.json();
        if (!response.ok || cancelled) {
          return;
        }

        /* ========== Transform API response into options format ========== */
        const options = Array.isArray(data.neighborhoods)
          ? data.neighborhoods.map((item) => ({
              value: item.name,
              label: `${item.name} - ${item.display_name}`,
            }))
          : [];

        /* ========== Update state and cache with the fetched options ========== */
        if (!cancelled) {
          cityNeighborhoodCacheRef.current.set(cityCacheKey, options);
          setCityNeighborhoodOptions(options);
        }
      } catch {
        if (!cancelled) {
          setCityNeighborhoodOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingNeighborhoods(false);
        }
      }
    }

    loadCityNeighborhoods();

    /* ========== Cleanup function ========== */
    return () => {
      cancelled = true;
    };
  }, [form.city, hasCityInput, isCitySelected, userId]);

  return {
    cityNeighborhoodOptions,
    loadingNeighborhoods,
    setCityNeighborhoodOptions,
  };
}
