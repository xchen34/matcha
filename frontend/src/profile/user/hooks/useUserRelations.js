import { useEffect, useState } from "react";
import { buildApiHeaders } from "@/utils.js";

export function useUserRelations(id, currentUser, profile) {
  const [liked, setLiked] = useState(false);
  const [likedByProfile, setLikedByProfile] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [canLikeProfiles, setCanLikeProfiles] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [likeError, setLikeError] = useState("");

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

        setLiked(Boolean(likeRes.ok && likeData?.liked));
        setIsMatch(Boolean(matchRes.ok && matchData?.is_match));

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

  async function toggleLike() {
    if (!currentUser?.id) return;

    if (!liked && !canLikeProfiles) {
      setLikeError("You must add a profile photo before liking users.");
      return;
    }

    setLoadingLike(true);
    setLikeError("");

    try {
      if (!liked) {
        const res = await fetch(`/api/users/${id}/like`, {
          method: "POST",
          headers: buildApiHeaders(currentUser),
        });

        if (res.ok) setLiked(true);
      } else {
        const res = await fetch(`/api/users/${id}/like`, {
          method: "DELETE",
          headers: buildApiHeaders(currentUser),
        });

        if (res.ok) {
          setLiked(false);
          setIsMatch(false);
        }
      }

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
