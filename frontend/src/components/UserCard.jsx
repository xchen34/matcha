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
    optimistic?.userId === user?.id
      ? optimistic.liked
      : Boolean(user?.liked);

  const isMatch =
    optimistic?.userId === user?.id
      ? optimistic.isMatch
      : Boolean(user?.is_match);

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
    <div className="
      relative mx-auto flex h-full w-full max-w-[19rem] flex-col overflow-hidden
      rounded-2xl border border-light
      bg-white
      shadow-sm
      transition hover:shadow-md hover:scale-[1.015]
    ">

      {/* IMAGE */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-light">

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

        {/* GRADIENT BOTTOM */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/100 via-white/30 to-transparent" />

        {/* ONLINE / OFFLINE */}
        <span
          className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold border
          ${
            user.is_online
              ? "bg-valid text-white border-valid-dark"
              : "bg-neutral-light text-neutral border-neutral"
          }`}
        >
          {user.is_online ? "Online" : "Offline"}
        </span>

        {/* LIKE + STATUS */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">

          <span
            className={`
              px-2 py-1 rounded-full text-[11px] font-semibold border
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
              border transition shadow-sm
              ${liked
                ? "bg-primary border-primary"
                : "bg-white border-neutral hover:border-primary"
              }
            `}
          >
            <FaHeart className={liked ? "text-white" : "text-primary"} size={18} />
          </button>

        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-4 text-neutral-dark">

        <h3 className="text-lg font-semibold text-neutral-dark">
          @{user.username}
        </h3>

        {/* INFOS */}
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-neutral">

          <span className="flex items-center gap-1">
            <FaTransgender className="text-primary" />
            {sanitizeText(user.gender) || "-"}
          </span>

          <span className="flex items-center gap-1">
            <FaUser className="text-primary" />
            {user.age ?? "-"}
          </span>

          <span className="flex items-center gap-1">
            <FaMapMarkerAlt className="text-primary" />
            {sanitizeText(user.city) || "-"}
          </span>

          {hasFameValue && (
            <span className="flex items-center gap-1 text-primary font-medium">
              <FaStar />
              {Math.floor(fameValue)}
            </span>
          )}

        </div>

        {/* TAGS */}
        <div className="mt-3 flex flex-wrap gap-1 text-xs">
          {Array.isArray(user.tags) &&
            user.tags.map((tag) => (
              <span
                key={tag}
                className="
                  rounded-full px-2 py-0.5
                  bg-primary-light
                  text-primary
                  border border-primary
                "
              >
                {sanitizeText(tag)}
              </span>
            ))}
        </div>

        {/* ERROR */}
        {error && (
          <p className="mt-2 text-xs text-error">{error}</p>
        )}

        <div className="mt-auto pt-4">
          <button
            onClick={() => navigate(`/users/${user.id}`)}
            className="
              w-full rounded-xl
              border border-primary-medium
              bg-primary-light
              px-3 py-2 text-sm font-semibold
              text-primary
              hover:bg-primary
              hover:text-white
              transition
            "
          >
            View profile
          </button>
        </div>

      </div>
    </div>
  );
}

export default UserCard;