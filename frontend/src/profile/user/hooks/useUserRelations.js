import { useEffect, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";

/**
 * Loads and manages the like/match relationship state for a profile page.
 *
 * The hook performs three jobs:
 * 1. Fetch the current like and match status from the API when the profile
 *    or logged-in user changes.
 * 2. Expose a toggleLike handler that sends POST/DELETE requests and then
 *    refreshes the match state.
 * 3. Accept realtime relation updates so the profile page can react to socket
 *    events without waiting for a manual refresh.
 */
export function useUserRelations(id, currentUser, profile) {
  const [liked, setLiked] = useState(false);
  const [likedByProfile, setLikedByProfile] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [canLikeProfiles, setCanLikeProfiles] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [likeError, setLikeError] = useState("");

  // Fetch the initial relationship state when we first open a profile or when
  // the active user changes.
  useEffect(() => {
    if (!id || !currentUser) return;

    async function fetchLikeState() {
      try {
        const [likeRes, matchRes, meRes] = await Promise.all([
          fetch(`/api/users/${id}/like`, {
            headers: buildApiHeaders(currentUser),
          }),
          fetch(`/api/users/${id}/is-match`, {
            headers: buildApiHeaders(currentUser),
          }),
          fetch("/api/profile/me", {
            headers: buildApiHeaders(currentUser),
          }),
        ]);

        const likeData = await likeRes.json().catch(() => ({}));
        const matchData = await matchRes.json().catch(() => ({}));
        const meData = await meRes.json().catch(() => ({}));

        // Sync local UI state with the server responses. Each endpoint answers
        // a different question, so we combine them into one profile relation
        // snapshot for the page.
        setLiked(Boolean(likeRes.ok && likeData?.liked));
        setIsMatch(Boolean(matchRes.ok && matchData?.is_match));

        // If the user's has a profile photo
        setCanLikeProfiles(
          Array.isArray(meData?.profile?.photos) &&
            meData.profile.photos.some((p) => p.is_primary),
        );
      } catch {
        setLiked(false);
        setIsMatch(false);
        setCanLikeProfiles(false);
      }
    }

    fetchLikeState();
  }, [id, currentUser]);

  // Send the like or unlike request, then refresh match state because the
  // backend may have created or removed a match as a side effect.
  async function toggleLike() {
    if (!currentUser?.id) return;

    if (!liked && !canLikeProfiles) {
      setLikeError("You must add a primary profile photo to enable likes.");
      return;
    }

    setLoadingLike(true);
    setLikeError("");

    try {
      if (!liked) {
        // Send like request
        const res = await fetch(`/api/users/${id}/like`, {
          method: "POST",
          headers: buildApiHeaders(currentUser),
        });

        if (res.ok) setLiked(true);
      } else {
        // Delete like
        const res = await fetch(`/api/users/${id}/like`, {
          method: "DELETE",
          headers: buildApiHeaders(currentUser),
        });

        if (res.ok) {
          setLiked(false);
          setIsMatch(false);
        }
      }

      // Always re-check the match state after a like toggle because the
      // relation can change in the same request cycle.
      const matchRes = await fetch(`/api/users/${id}/is-match`, 
        {
          headers: buildApiHeaders(currentUser),
        }
      );

      const matchData = await matchRes.json().catch(() => ({}));
      setIsMatch(Boolean(matchData?.is_match));
      
    } catch (e) {
      setLikeError(e?.message || "Error");
    } finally {
      setLoadingLike(false);
    }
  }

  // Merge realtime relation events into the current profile state. This keeps
  // the UI correct when the backend pushes an update without a full refetch.
  function applyRealtimeRelationUpdate(type) {
    if (type === "match") {
      setLiked(true);
      setLikedByProfile(true);
      setIsMatch(true);
      return;
    }

    if (type === "like_received") {
      setLikedByProfile(true);
      return;
    }

    if (type === "unlike") {
      setLikedByProfile(false);
      setIsMatch(false);
    }
  }

  return {
    liked,
    likedByProfile,
    isMatch,
    canLikeProfiles,
    loadingLike,
    likeError,
    toggleLike,
    applyRealtimeRelationUpdate,
    setLiked,
    setLikedByProfile,
    setIsMatch,
  };
}
