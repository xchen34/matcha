import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sanitizeText } from "@/utils/xssEscape.js";
import { actionButtonClass } from "@/styles/UIClasses.jsx";
import { buildApiHeaders } from "@/utils/utils.js";
import { onRealtimeEvent } from "@/realtime/socket.js";
import { REALTIME_EVENTS } from "@/realtime/events.js";
import { 
  Heart, Zap, UserRound, 
  Star, MapPin, 
  VenusAndMars, Sparkle 
} from "lucide-react"
import { capitalizeFirst, formatTag } from "@/utils/utils.js";

/**
 * Renders a compact profile card for popularity lists and discovery views.
 *
 * The card shows the user's photo, online state, metadata, tags, and a
 * primary action button. It also keeps an optimistic like/match state so the
 * UI feels immediate, then reconciles with realtime socket events and the
 * server response after each interaction.
 */
function UserCard({ user, currentUser, canLikeProfiles = true }) {
  const navigate = useNavigate();
  const [optimistic, setOptimistic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pick the first available profile photo field and memoize the result so we
  // do not recompute the fallback chain on every render.
  const profilePhotoUrl = useMemo(
    () =>
      user?.profile_photo_url ||
      user?.avatarUrl ||
      user?.primary_photo_url ||
      user?.photo_url ||
      null,
    [user]
  );

  // Subscribe to backend events that change the like or match state. This lets
  // the card update immediately when another action happens elsewhere.
  useEffect(() => {
    if (!user?.id) return;

    // When the backend reports a like status change for this user, preserve
    // the current match state if we already know it and only update the like
    // flag coming from the event.
    const offLikeStatusChanged = onRealtimeEvent(
      REALTIME_EVENTS.LIKE_STATUS_CHANGED,
      (payload) => {
        if (Number(payload?.userId) === Number(user.id)) {
          setOptimistic((prev) => ({
            userId: user.id,
            liked: payload.liked,
            isMatch: prev?.isMatch ?? Boolean(user?.is_match),
          }));
        }
      }
    );

    // When the backend confirms a match state change, keep the current like
    // flag if we already have one and only replace the match flag.
    const offMatchStatusChanged = onRealtimeEvent(
      REALTIME_EVENTS.MATCH_STATUS_CHANGED,
      (payload) => {
        if (Number(payload?.userId) === Number(user.id)) {
          setOptimistic((prev) => ({
            userId: user.id,
            liked: prev?.liked ?? Boolean(user?.liked),
            isMatch: payload.matched,
          }));
        }
      }
    );

    return () => {
      offLikeStatusChanged();
      offMatchStatusChanged();
    };
  }, [user?.id, user?.is_match, user?.liked]);

  // Resolve the displayed like state from either the optimistic update or the
  // last known server-provided value.
  const liked =
    optimistic?.userId === user?.id
      ? optimistic.liked
      : Boolean(user?.liked);

  const isMatch =
    optimistic?.userId === user?.id
      ? optimistic.isMatch
      : Boolean(user?.is_match);

  // The fame rating is displayed only when the backend provided a numeric
  // value that can be safely rendered.
  const fameValue = Number(user?.fame_rating);
  const hasFameValue = Number.isFinite(fameValue);

  // Toggle like/unlike, update the UI optimistically, then ask the backend for
  // the final match state because that can change as a side effect.
  async function handleToggleLike() {
    setLoading(true);
    setError("");

    try {
      if (!liked && !canLikeProfiles) {
        throw new Error("Add a profile photo first to like users.");
      }
      
      if (!user?.profile_photo_url && !user?.avatarUrl && !user?.primary_photo_url && !user?.photo_url) {
        throw new Error("User has no profile photo");
      }
      
      const nextLiked = !liked;
      if (!liked) {
        const res = await fetch(`/api/users/${user.id}/like`, 
          {
            method: "POST",
            headers: buildApiHeaders(currentUser),
          }
        );

        if (!res.ok) throw new Error("Error while liking");
        
        // Optimistically reflect the new liked state right away.
        setOptimistic({
          userId: user.id,
          liked: nextLiked,
          isMatch,
        });
      } else {
        const res = await fetch(`/api/users/${user.id}/like`, 
          {
            method: "DELETE",
            headers: buildApiHeaders(currentUser),
          }
        );
        
        if (!res.ok) throw new Error("Error when unliking");
        
        // Clear the match state locally when the user unlikes, then reconcile
        // with the server's current match state below.
        setOptimistic({
          userId: user.id,
          liked: nextLiked,
          isMatch: false,
        });
      }

      // Pull the latest match state from the server so the UI stays aligned
      // with the real backend relation state.
      const matchRes = await fetch(`/api/users/${user.id}/is-match`, 
        {
          headers: buildApiHeaders(currentUser),
        }
      );

      const matchData = await matchRes.json();

      setOptimistic({
        userId: user.id,
        liked: nextLiked,
        isMatch: !!matchData.is_match,
      });
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="
      relative mx-auto flex h-full w-full max-w-[19rem] flex-col overflow-hidden
      rounded-3xl border border-light bg-white
      shadow-sm transition-all duration-300
      hover:-translate-y-1 hover:shadow-xl
    ">
      {/* ======== IMAGE + STATUS ======== */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-light">
        {/* Profile photo with fallback */}
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={`@${user.username}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral">
            No profile photo
          </div>
        )}

        {/* Gradient bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/100 via-white/30 to-transparent" />

        {/* Online status */}
        <div className="absolute left-3 top-3">
          <span
            className={`
              inline-flex items-center rounded-full px-2 py-1
              text-[11px] font-semibold border
              transition
              ${
                user.is_online
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }
            `}
          >
            <span
              className={`
                mr-2 h-2 w-2 rounded-full
                ${user.is_online ? "bg-emerald-500" : "bg-slate-400"}
              `}
            />
            {user.is_online ? "Online" : "Offline"}
          </span>
        </div>

        {/* Like button */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span
            className={`
              px-2 py-1 rounded-full text-[11px] font-semibold border transition
              ${
                isMatch
                  ? "bg-primary text-white border-primary"
                  : liked
                  ? "bg-primary-light text-primary border-primary"
                  : "bg-white text-neutral border-neutral"
              }
            `}
          >
            {isMatch ? "Match" : liked ? "Liked" : "Like"}
          </span>

          <button
            onClick={handleToggleLike}
            disabled={loading || user.id === currentUser.id}
            className={`
              h-11 w-11 rounded-full flex items-center justify-center
              border shadow-sm transition-all duration-200
              hover:scale-110 active:scale-95
              ${
                isMatch
                  ? "bg-primary border-primary"
                  : liked
                  ? "bg-primary-light border-primary"
                  : "bg-white border-neutral"
              }
            `}
          >
            {isMatch ? (
              <Zap className="text-white fill-white" size={18} />
            ) : liked ? (
              <Heart className="text-primary fill-primary" size={18} />
            ) : (
              <Heart className="text-neutral fill-white" size={18} />
            )}
          </button>
        </div>
      </div>

      {/* ======== CONTENT ======== */}
      <div className="flex flex-1 flex-col p-4 text-neutral-dark">
        {/* Primary identity line for the card */}
        <h3 className="text-lg font-semibold text-neutral-dark">
          @{user.username}
        </h3>

        {/* Compact metadata row: gender, age, city, and fame rating */}
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral/80">
          <span className="flex items-center gap-1">
            <VenusAndMars className="text-primary" />
            {sanitizeText(capitalizeFirst(user.gender)) || "-"}
          </span>

          <span className="flex items-center gap-1">
            <UserRound className="text-primary" />
            {user.age ?? "-"}
          </span>

          <span className="flex items-center gap-1">
            <MapPin className="text-primary" />
            {sanitizeText(user.city) || "-"}
          </span>

          {hasFameValue && (
            <span className="flex items-center gap-1 text-primary font-medium">
              <Star />
              {Math.floor(fameValue)}
            </span>
          )}
        </div>

        {/* Interest tags rendered as small pills for quick scanning */}
        <div className="mt-3 flex flex-wrap gap-1 text-xs">
          {Array.isArray(user.tags) &&
            user.tags.map((tag) => (
              <span
                key={tag}
                className="
                  rounded-full px-2 py-0.5
                  bg-primary/10 text-primary
                  text-[11px] font-medium
                  border border-primary/10
                  hover:bg-primary/20 transition
                "
              >
                {sanitizeText(formatTag(tag))}
              </span>
            ))}
        </div>

        {/* Surface any validation or network error from the like action */}
        {error && (
          <p className="mt-2 text-xs text-error">{error}</p>
        )}

        {/* Open the full profile page using the router */}
        <div className="mt-auto pt-4">
          <button
            onClick={() => navigate(`/users/${user.id}`)}
            className={`w-full ${actionButtonClass} inline-flex items-center justify-center`}
          >
            <Sparkle size={16} aria-hidden="true" className="mr-2" />
            View profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserCard;
