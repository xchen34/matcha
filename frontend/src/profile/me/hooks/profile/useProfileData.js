import { useCallback, useEffect, useRef, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";
import { writeStoredUser } from "@/utils/userStorage.js";

export default function useProfileData({
  userId,
  currentUser,
  onProfileUpdate,
  setForm,
  setMessage,
  setIsCityConfirmed,
  setLoading,
}) {
  /* ========== State ========== */
  const [tagOptions, setTagOptions] = useState([]);

  /* ========== Extract current user data ========== */
  const currentUserId = currentUser?.id ?? null;
  const currentUsername = currentUser?.username ?? "";
  const currentEmail = currentUser?.email ?? "";
  const currentProfileCompleted = Boolean(currentUser?.profile_completed);
  const currentRealtimeToken = currentUser?.realtime_token ?? "";

  /* ========== References of last loaded userId and loading state to prevent duplicate loads ========== */
  const lastLoadedUserIdRef = useRef(null);
  const loadingRef = useRef(false);

  /* ========= Load profile data ========== */
  const loadProfile = useCallback(
    async (options = {}) => {
      const { force = false } = options;
      if (!userId) {
        setMessage("Please login first.");
        setLoading(false);
        return;
      }

      // Prevent duplicate loads if already loading
      if (!force && loadingRef.current) return;
      if (!force && lastLoadedUserIdRef.current === userId) return;

      loadingRef.current = true;
      setLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/profile/me", 
        {
          headers: buildApiHeaders({ id: userId }),
        }
      );
        const data = await response.json();

        if (!response.ok) {
          setMessage(`Error: ${data.error || "Failed to load profile"}`);
          setLoading(false);

          if (response.status === 401) {
            setMessage("Not authorized. Please login again if needed.");
          }
          return;
        }

        /* Set form fields using current values */
        setForm({
          username: data.user?.username || currentUsername,
          first_name: data.user?.first_name || "",
          last_name: data.user?.last_name || "",
          email: data.user?.email || "",
          gender: data.profile.gender || "",
          sexual_preference: data.profile.sexual_preference || "",
          biography: data.profile.biography || "",
          birth_date: data.profile.birth_date
            ? String(data.profile.birth_date).slice(0, 10)
            : "",
          city: data.profile.city || "",
          neighborhood: data.profile.neighborhood || "",
          gps_consent: Boolean(data.profile.gps_consent),
          latitude:
            data.profile.latitude !== null &&
            data.profile.latitude !== undefined
              ? String(data.profile.latitude)
              : "",
          longitude:
            data.profile.longitude !== null &&
            data.profile.longitude !== undefined
              ? String(data.profile.longitude)
              : "",
          tags: Array.isArray(data.profile.tags) ? data.profile.tags : [],
          photos: Array.isArray(data.profile.photos) ? data.profile.photos : [],
        });

        /* Set city confirmation state based on loaded city value */
        setIsCityConfirmed(Boolean((data.profile.city || "").trim()));

        /* If current user data is available, update it */
        if (data.user && typeof onProfileUpdate === "function") {
          const nextUser = {
            ...data.user,
            id: data.user?.id ?? currentUserId,
            username: data.user?.username ?? currentUsername,
            email: data.user?.email ?? currentEmail,
            realtime_token: data.user?.realtime_token ?? currentRealtimeToken,
            profile_completed:
              data.user?.profile_completed ?? currentProfileCompleted,
          };
          const shouldSyncUser =
            currentUserId !== (nextUser?.id ?? null) ||
            currentUsername !== (nextUser?.username ?? "") ||
            currentEmail !== (nextUser?.email ?? "") ||
            currentProfileCompleted !== Boolean(nextUser?.profile_completed);

          if (shouldSyncUser) {
            writeStoredUser(nextUser);
            onProfileUpdate(nextUser);
          }
        }
      } catch (error) {
        setMessage(`Error: ${error.message}`);
      } finally {
        lastLoadedUserIdRef.current = userId;
        loadingRef.current = false;
        setLoading(false);
      }
  }, [
      currentUserId,
      currentUsername,
      currentEmail,
      currentProfileCompleted,
      currentRealtimeToken,
      onProfileUpdate,
      setForm,
      setIsCityConfirmed,
      setLoading,
      setMessage,
      userId,
  ]);

  /* ========= Load profile on mount and when userId changes ========== */
  useEffect(() => {
    lastLoadedUserIdRef.current = null;
    loadProfile();
  }, [loadProfile]);

  /* ========= Load tag options for profile editing ========== */
  useEffect(() => {
    let cancelled = false;

    async function fetchTagOptions() {
      if (!userId) {
        return;
      }

      try {
        const response = await fetch("/api/profile/tags", {
          headers: buildApiHeaders({ id: userId }),
        });
        const data = await response.json();
        if (!response.ok || cancelled) {
          return;
        }

        setTagOptions(Array.isArray(data.tags) ? data.tags : []);
      } catch {
        if (!cancelled) {
          setTagOptions([]);
        }
      }
    }
    fetchTagOptions();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    tagOptions,
    loadProfile,
  };
}
