import { FaHeart, FaUser, FaMapMarkerAlt, FaTags, FaStar, FaTransgender } from "react-icons/fa";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";


function UserCard({ user, currentUser, canLikeProfiles = true }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(Boolean(user?.liked));
  const [isMatch, setIsMatch] = useState(Boolean(user?.is_match));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const profilePhotoUrl = useMemo(
    () => user?.primary_photo_url || user?.photo_url || null,
    [user?.primary_photo_url, user?.photo_url],
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
        // Like
        const res = await fetch(`/api/users/${user.id}/like`, {
          method: "POST",
          headers: { "x-user-id": currentUser.id },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const alreadyLikedMessages = ["Already liked", "Déjà liké", "Deja like"];
          if (!alreadyLikedMessages.includes(data.message)) {
            throw new Error(data.error || "Error while liking");
          }
        }
        setLiked(true);
      } else {
        // Unlike
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
    <div className="relative flex flex-col justify-between h-full gap-3 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-orange-100 transition hover:shadow-md">
      <div>
        <div className="relative overflow-hidden rounded-xl mb-4">
          {profilePhotoUrl ? (
            <img
              src={profilePhotoUrl}
              alt={`@${user.username} profile`}
              className="h-40 w-full object-contain rounded-xl"
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              No profile photo
            </div>
          )}
          {/* Online/offline label bottom right */}
          <span
            className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold shadow border border-white ${user.is_online ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
            title={user.is_online ? "Online" : "Offline"}
          >
            {user.is_online ? "Online" : "Offline"}
          </span>
        </div>

        <div className="space-y-2">
          <h3
            className="text-lg font-semibold text-slate-900 max-w-full truncate mb-1"
            style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={`@${user.username}`}
          >
            @{user.username}
          </h3>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600 items-center mb-1">
            <span className="inline-flex items-center gap-1">
              <FaTransgender size={13} aria-hidden="true" />
              <span className="font-semibold text-slate-800">{user.gender || "-"}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="font-semibold text-slate-500">Pref:</span>
              <span className="font-semibold text-slate-800">{user.sexual_preference || "-"}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <FaUser size={13} aria-hidden="true" />
              <span className="font-semibold text-slate-800">{user.age !== undefined && user.age !== null ? user.age : "-"}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <FaMapMarkerAlt size={13} aria-hidden="true" />
              <span className="font-semibold text-slate-800">
                {user.city || "-"}
                {user.neighborhood ? ` - ${user.neighborhood}` : ""}
              </span>
            </span>
            {typeof user.fame_rating === "number" && (
              <span className="inline-flex items-center gap-1">
                <FaStar size={13} aria-hidden="true" />
                <span className="font-semibold text-slate-800">{Math.floor(user.fame_rating)}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 text-xs text-slate-600 items-center mb-2">
            <FaTags size={12} aria-hidden="true" />
            {Array.isArray(user.tags) && user.tags.length > 0 ? (
              user.tags.map((tag) => (
                <span
                  key={`${user.id}-${tag}`}
                  className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="font-semibold text-slate-800">-</span>
            )}
          </div>
        </div>
      </div>
      {!profilePhotoUrl && (
        <div className="text-amber-700 mb-1">No profile photo: can't be liked.</div>
      )}

      {/* Footer always at the bottom for perfect alignment */}
      <div className="flex items-center justify-between mt-2 text-xs font-semibold text-slate-700">
        <button
          type="button"
          onClick={() => navigate(`/users/${user.id}`)}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:-translate-y-0.5 transition"
        >
          View profile
        </button>
        <span className="flex items-center gap-1">
          <span className={isMatch ? "text-red-600" : liked ? "text-orange-600" : "text-slate-700"}>
            {isMatch ? "Match" : liked ? "Liked" : "Not liked"}
          </span>
          <button
            className={`flex h-7 w-7 items-center justify-center rounded-full border transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${isMatch ? "border-red-700 bg-red-600 shadow-md shadow-red-200" : liked ? "border-orange-300 bg-gradient-to-br from-orange-500 to-brand-deep shadow-md shadow-orange-200 ring-2 ring-orange-300/60" : "border-slate-300 bg-slate-200"}`}
            onClick={handleToggleLike}
            disabled={
              loading ||
              user.id === currentUser.id ||
              (!liked && (!canLikeProfiles || !profilePhotoUrl))
            }
            aria-label={liked ? "Remove like" : "Like this user"}
            title={
              !liked && !canLikeProfiles
                ? "You must add a profile photo to like others."
                : !liked && !profilePhotoUrl
                  ? "This user has no profile photo."
                : liked
                  ? "Unlike"
                  : "Like"
            }
          >
            {isMatch ? (
              <span className="relative inline-flex h-3 w-4 items-center justify-center">
                <FaHeart size={10} className="absolute left-0 text-white" />
                <FaHeart size={10} className="absolute right-0 text-white" />
              </span>
            ) : (
              <FaHeart
                color="#fff"
                style={{ stroke: "#fff" }}
                size={14}
              />
            )}
          </button>
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default UserCard;
