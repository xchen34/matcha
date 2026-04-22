import { FaHeart, FaUser, FaMapMarkerAlt, FaTags, FaStar, FaTransgender } from "react-icons/fa";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sanitizeText } from "../utils/xssEscape.js";

function UserCard({ user, currentUser, canLikeProfiles = true }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(Boolean(user?.liked));
  const [isMatch, setIsMatch] = useState(Boolean(user?.is_match));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const profilePhotoUrl = useMemo(
    () =>
      user?.profile_photo_url ||
      user?.avatarUrl ||
      user?.primary_photo_url ||
      user?.photo_url ||
      null,
    [user]
  );

  useEffect(() => {
    setLiked(Boolean(user?.liked));
    setIsMatch(Boolean(user?.is_match));
  }, [user?.id, user?.liked, user?.is_match]);

  async function handleToggleLike() {
    setLoading(true);
    setError("");

    try {
      if (!liked && !canLikeProfiles) {
        throw new Error("Add a profile picture first to like users.");
      }

      if (!liked) {
        const res = await fetch(`/api/users/${user.id}/like`, {
          method: "POST",
          headers: { "x-user-id": currentUser.id },
        });
        if (!res.ok) throw new Error("Error while liking");
        setLiked(true);
      } else {
        const res = await fetch(`/api/users/${user.id}/like`, {
          method: "DELETE",
          headers: { "x-user-id": currentUser.id },
        });
        if (!res.ok) throw new Error("Error when unliking");
        setLiked(false);
        setIsMatch(false);
      }

      const matchRes = await fetch(`/api/users/${user.id}/is-match`, {
        headers: { "x-user-id": currentUser.id },
      });
      const matchData = await matchRes.json();
      setIsMatch(!!matchData.is_match);
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-full box-border overflow-hidden flex flex-col justify-between h-full gap-2 sm:gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm transition hover:shadow-md">

      {/* IMAGE */}
      <div className="relative overflow-hidden rounded-xl mb-3">
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={`@${user.username}`}
            className="h-36 sm:h-44 w-full object-contain rounded-xl"
          />
        ) : (
          <div className="flex h-36 sm:h-44 w-full items-center justify-center text-xs font-medium text-slate-400">
            No profile photo
          </div>
        )}

        <span
          className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-100
            ${user.is_online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
        >
          {user.is_online ? "Online" : "Offline"}
        </span>
      </div>

      {/* USERNAME */}
      <h3
        className="text-base sm:text-lg font-semibold text-slate-900 truncate max-w-full"
        title={`@${user.username}`}
      >
        @{user.username}
      </h3>

      {/* MOBILE QUICK INFO */}
      <div className="flex sm:hidden gap-2 text-xs text-slate-500 mb-2 min-w-0">
        <span className="truncate">{user.age ?? "-"}</span>
        <span>•</span>
        <span className="truncate">{sanitizeText(user.city) || "-"}</span>
      </div>

      {/* INFO DESKTOP */}
      <div className="hidden sm:flex flex-wrap gap-2 text-sm text-slate-500 items-center mb-1">
        <span className="inline-flex items-center gap-1">
          <FaTransgender size={13} />
          <span className="font-semibold text-slate-800">{sanitizeText(user.gender) || "-"}</span>
        </span>

        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-slate-500">Pref:</span>
          <span className="font-semibold text-slate-800">{sanitizeText(user.sexual_preference) || "-"}</span>
        </span>

        <span className="inline-flex items-center gap-1">
          <FaUser size={13} />
          <span className="font-semibold text-slate-800">{user.age ?? "-"}</span>
        </span>

        <span className="inline-flex items-center gap-1 min-w-0">
          <FaMapMarkerAlt size={13} />
          <span className="font-semibold text-slate-800 truncate">
            {sanitizeText(user.city) || "-"}
            {user.neighborhood ? ` - ${sanitizeText(user.neighborhood)}` : ""}
          </span>
        </span>

        {typeof user.fame_rating === "number" && (
          <span className="inline-flex items-center gap-1">
            <FaStar size={13} />
            <span className="font-semibold text-slate-800">
              {Math.floor(user.fame_rating)}
            </span>
          </span>
        )}
      </div>

      {/* TAGS (LIMITED + SAFE) */}
      <div className="flex flex-wrap gap-1 text-xs text-slate-600 items-center mb-2 max-w-full overflow-hidden">
        <FaTags size={12} className="text-slate-400 hidden sm:inline" />

        {Array.isArray(user.tags) && user.tags.length > 0 ? (
          user.tags.slice(0, 3).map((tag) => (
            <span
              key={`${user.id}-${tag}`}
              className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 text-[11px] sm:text-xs max-w-[120px] truncate"
            >
              {sanitizeText(tag)}
            </span>
          ))
        ) : (
          <span className="font-semibold text-slate-800">-</span>
        )}
      </div>

      {/* WARNING */}
      {!profilePhotoUrl && (
        <div className="text-[11px] sm:text-sm text-amber-600">
          No profile photo — like disabled
        </div>
      )}

      {/* FOOTER SAFE */}
      <div className="flex items-center justify-between gap-2 mt-2 text-[11px] sm:text-xs font-medium text-slate-600 w-full min-w-0">

        <button
          onClick={() => navigate(`/users/${user.id}`)}
          className="px-2 sm:px-3 py-1 rounded-full border border-slate-200 bg-white shrink-0"
        >
          View profile
        </button>

        <span className="flex items-center gap-1 min-w-0">
          <span className={isMatch ? "text-red-600" : liked ? "text-orange-600" : "text-slate-700"}>
            {isMatch ? "Match" : liked ? "Liked" : "Not liked"}
          </span>

          <button
            onClick={handleToggleLike}
            disabled={
              loading ||
              user.id === currentUser.id ||
              (!liked && (!canLikeProfiles || !profilePhotoUrl))
            }
            className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border transition
              ${isMatch
                ? "border-red-700 bg-red-600"
                : liked
                ? "border-orange-300 bg-orange-500"
                : "border-slate-300 bg-slate-200"
              }`}
          >
            <FaHeart size={12} color="#fff" />
          </button>
        </span>
      </div>

      {/* ERROR */}
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export default UserCard;