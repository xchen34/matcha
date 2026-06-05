import { useEffect, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";

export function useUserRelations(id, currentUser, profile) {
  const [liked, setLiked] = useState(false);
  const [likedByProfile, setLikedByProfile] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [canLikeProfiles, setCanLikeProfiles] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [likeError, setLikeError] = useState("");

  /* ========== Load initial like/match state from API ========== */
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

        // Update state based on API responses
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

  /* ========== Toggle like/unlike and check for match ========== */
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

      // Always check match status after toggling like, as it may have changed
      const matchRes = await fetch(`/api/users/${id}/is-match`, {
        headers: buildApiHeaders(currentUser),
      });
      const matchData = await matchRes.json().catch(() => ({}));
      setIsMatch(Boolean(matchData?.is_match));
      
    } catch (e) {
      setLikeError(e?.message || "Error");
    } finally {
      setLoadingLike(false);
    }
  }

  /* ========== Apply real-time updates to like/match state ========== */
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
