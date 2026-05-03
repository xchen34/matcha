import { useState } from "react";
import { buildApiHeaders } from "../../../utils.js";

export default function useLocation(userId, setForm, setMessage) {
  const [loadingGeo, setLoadingGeo] = useState(false);

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation not supported");
      return;
    }

    setLoadingGeo(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude.toFixed(6);
        const longitude = pos.coords.longitude.toFixed(6);

        setForm((prev) => ({
          ...prev,
          gps_consent: true,
          latitude,
          longitude,
        }));

        try {
          const res = await fetch(
            `/api/profile/reverse-geocode?latitude=${latitude}&longitude=${longitude}`,
            {
              headers: buildApiHeaders({ id: userId }),
            }
          );

          const data = await res.json();

          if (res.ok) {
            setForm((prev) => ({
              ...prev,
              city: data.city || prev.city,
              neighborhood: data.neighborhood || prev.neighborhood,
            }));

            setMessage("Location detected");
          } else {
            setMessage("Location detected but not resolved");
          }
        } catch {
          setMessage("Reverse geocoding failed");
        } finally {
          setLoadingGeo(false);
        }
      },
      () => {
        setLoadingGeo(false);
        setMessage("GPS denied or unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return { loadingGeo, useCurrentLocation };
}