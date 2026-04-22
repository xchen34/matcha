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
    <div className="mx-auto w-full max-w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[5/6] w-full overflow-hidden bg-slate-100 sm:aspect-[4/5]">
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={`@${user.username}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
            No profile photo
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

        <span
          className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-medium border border-white/60 backdrop-blur
            ${user.is_online ? "bg-emerald-100/95 text-emerald-700" : "bg-slate-100/95 text-slate-600"}`}
        >
          {user.is_online ? "Online" : "Offline"}
        </span>

        <button
          onClick={handleToggleLike}
          disabled={
            loading ||
            user.id === currentUser.id ||
            (!liked && (!canLikeProfiles || !profilePhotoUrl))
          }
          className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-lg transition
            ${isMatch
              ? "border-red-700 bg-red-600"
              : liked
              ? "border-orange-300 bg-orange-500"
              : "border-white/80 bg-slate-700/70 backdrop-blur"
            }`}
          aria-label={isMatch ? "Match" : liked ? "Liked" : "Like"}
        >
          <FaHeart size={18} color="#fff" />
        </button>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        <div className="space-y-0.5">
          <h3
            className="truncate text-xl font-semibold text-slate-900"
            title={`@${user.username}`}
          >
            @{user.username}
          </h3>
          <p className={`text-xs font-semibold ${isMatch ? "text-red-600" : liked ? "text-orange-600" : "text-slate-600"}`}>
            {isMatch ? "Match" : liked ? "Liked" : "Not liked"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
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
          <span className="inline-flex min-w-0 items-center gap-1">
            <FaMapMarkerAlt size={13} />
            <span className="truncate font-semibold text-slate-800">
              {sanitizeText(user.city) || "-"}
              {user.neighborhood ? ` - ${sanitizeText(user.neighborhood)}` : ""}
            </span>
          </span>
          {typeof user.fame_rating === "number" && (
            <span className="inline-flex items-center gap-1">
              <FaStar size={13} />
              <span className="font-semibold text-slate-800">{Math.floor(user.fame_rating)}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
          <FaTags size={12} className="text-slate-400" />
          {Array.isArray(user.tags) && user.tags.length > 0 ? (
            user.tags.slice(0, 3).map((tag) => (
              <span
                key={`${user.id}-${tag}`}
                className="max-w-[120px] truncate rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600"
              >
                {sanitizeText(tag)}
              </span>
            ))
          ) : (
            <span className="font-semibold text-slate-800">-</span>
          )}
        </div>

        {!profilePhotoUrl && (
          <div className="text-xs text-amber-600">No profile photo — like disabled</div>
        )}

        <button
          onClick={() => navigate(`/users/${user.id}`)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          View profile
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export default UserCard;
