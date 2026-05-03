import { FaBan, FaHeart, FaUser, FaMapMarkerAlt, FaTags, FaStar, FaTransgender } from "react-icons/fa";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sanitizeText } from "../utils/xssEscape.js";

function UserCard({ user, currentUser, canLikeProfiles = true }) {
  const navigate = useNavigate();
  const [optimistic, setOptimistic] = useState(null);
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

  const liked =
    optimistic?.userId === user?.id ? optimistic.liked : Boolean(user?.liked);
  const isMatch =
    optimistic?.userId === user?.id ? optimistic.isMatch : Boolean(user?.is_match);

  const likeDisabledBecauseNoOwnPhoto =
    !liked && !canLikeProfiles && user?.id !== currentUser?.id;
  const fameValue = Number(user?.fame_rating);
  const hasFameValue = Number.isFinite(fameValue);

  async function handleToggleLike() {
    setLoading(true);
    setError("");

    try {
      if (!liked && !canLikeProfiles) {
        throw new Error("Add a profile picture first to like users.");
      }
      const nextLiked = !liked;

      if (!liked) {
        const res = await fetch(`/api/users/${user.id}/like`, {
          method: "POST",
          headers: { "x-user-id": currentUser.id },
        });
        if (!res.ok) throw new Error("Error while liking");
        setOptimistic({
          userId: user.id,
          liked: nextLiked,
          isMatch,
        });
      } else {
        const res = await fetch(`/api/users/${user.id}/like`, {
          method: "DELETE",
          headers: { "x-user-id": currentUser.id },
        });
        if (!res.ok) throw new Error("Error when unliking");
        setOptimistic({
          userId: user.id,
          liked: nextLiked,
          isMatch: false,
        });
      }

      const matchRes = await fetch(`/api/users/${user.id}/is-match`, {
        headers: { "x-user-id": currentUser.id },
      });
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
    <div className="relative mx-auto flex h-full w-full max-w-[19rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:scale-105">
      {/* IMAGE */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 sm:aspect-[3/4]">
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={`@${user.username}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-500">
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

        {/* LIKE BUTTON + STATUS INLINE */}
        <div className="group absolute bottom-3 right-3 flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur
              ${isMatch
                ? "bg-red-600 text-white"
                : liked
                ? "bg-orange-500 text-white"
                : "bg-slate-800/70 text-white"
              }`}
          >
            {isMatch ? "Match" : liked ? "Liked" : "Not liked"}
          </span>

          {/* BUTTON */}
          <button
            onClick={handleToggleLike}
            disabled={
              loading ||
              user.id === currentUser.id ||
              (!liked && (!canLikeProfiles || !profilePhotoUrl))
            }
            className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-lg transition
              ${isMatch
                ? "border-red-700 bg-red-600"
                : liked
                ? "border-orange-300 bg-orange-500"
                : "border-white/80 bg-slate-700/70 backdrop-blur"
              } ${likeDisabledBecauseNoOwnPhoto ? "cursor-not-allowed" : ""}`}
          >
            <FaHeart size={18} color="#fff" />
            {likeDisabledBecauseNoOwnPhoto && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-sm">
                <FaBan size={10} />
              </span>
            )}
          </button>

          {/* TOOLTIP */}
          {likeDisabledBecauseNoOwnPhoto && (
            <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-52 rounded-lg bg-black/80 px-3 py-2 text-xs font-medium text-white shadow-lg opacity-0 group-hover:opacity-100 transition">
              Add a primary profile photo to enable likes.
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {/* HEADER */}
        <div className="mb-2">
          <h3 className="truncate text-xl font-semibold text-slate-900">
            @{user.username}
          </h3>
        </div>

        {/* INFOS */}
        <div className="mb-2 flex flex-wrap gap-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1">
            <FaTransgender size={13} />
            <span className="font-semibold text-slate-800">
              {sanitizeText(user.gender) || "-"}
            </span>
          </span>

          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-slate-500">Pref:</span>
            <span className="font-semibold text-slate-800">
              {sanitizeText(user.sexual_preference) || "-"}
            </span>
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
            {hasFameValue && (
              <span className="inline-flex items-center gap-1">
                <FaStar size={13} />
                <span className="font-semibold text-slate-800">{Math.floor(fameValue)}</span>
              </span>
            )}
          </div>

        {/* TAGS */}
        <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-600">
          <FaTags size={12} className="text-slate-500" />

          {Array.isArray(user.tags) && user.tags.length > 0 ? (
            user.tags.map((tag) => (
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

        {/* ERROR */}
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

        {/* BUTTON BOTTOM */}
        <div className="mt-auto flex justify-end pt-2">
          <button
            onClick={() => navigate(`/users/${user.id}`)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-black border border-slate-300 hover:bg-slate-100 transition"
          >
            <FaUser size={12} />
            View profile
          </button>
        </div>

      </div>
    </div>
  );
}

export default UserCard;
