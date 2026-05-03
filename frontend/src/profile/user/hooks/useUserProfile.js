import { useEffect, useState } from "react";
import { buildApiHeaders } from "../../../utils.js";

export function useUserProfile(id, currentUser) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function fetchProfile() {
      setLoading(true);
      setError("");

      try {
        let response;

        if (currentUser && String(currentUser.id) === String(id)) {
          response = await fetch(`/api/profile/me`, {
            headers: buildApiHeaders(currentUser),
          });
        } else {
          response = await fetch(`/api/profile/${id}`, {
            headers: buildApiHeaders(currentUser),
          });
        }

        if (response.status === 401 || response.status === 403) {
          window.location.href = "/login";
          return;
        }

        const payload = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setError(payload.error || "Failed to load profile");
          }
          return;
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load profile");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [id, currentUser]);

  return { data, loading, error, setData };
}