import { useEffect, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";

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

        // If fetching the current user's profile, use the /api/profile/me endpoint
        if (currentUser && String(currentUser.id) === String(id)) {
          response = await fetch(`/api/profile/me`, {
            headers: buildApiHeaders(currentUser),
          });
        } else {
          // Fetching another user's profile
          response = await fetch(`/api/profile/${id}`, {
            headers: buildApiHeaders(currentUser),
          });
        }

        // Handle unauthorized access by redirecting to login
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

        // Save user data to local storage if it's the current user's profile
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

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      cancelled = true;
    };
  }, [id, currentUser]);

  return {
    data,
    loading,
    error,
    setData,
  };
}
