import { FaHeart } from "react-icons/fa";

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
    <div className="relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-orange-100 transition hover:shadow-md">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={`@${user.username} profile`}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            No profile photo
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">@{user.username}</h3>
        <p className="text-sm text-slate-600">
          Status:{" "}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.is_online ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
          >
            {user.is_online ? "Online" : "Offline"}
          </span>
        </p>
        <p className="text-sm text-slate-600">
          Email: <span className="font-semibold text-slate-800">{user.email}</span>
        </p>
        <p className="text-sm text-slate-600">
          Age:{" "}
          <span className="font-semibold text-slate-800">
            {user.age !== undefined && user.age !== null ? user.age : "-"}
          </span>
        </p>
        <p className="text-sm text-slate-600">
          City: <span className="font-semibold text-slate-800">{user.city || "-"}</span>
        </p>
        <p className="text-sm text-slate-600">
          Neighborhood: <span className="font-semibold text-slate-800">{user.neighborhood || "-"}</span>
        </p>
        <div className="text-sm text-slate-600">
          Tags:{" "}
          {Array.isArray(user.tags) && user.tags.length > 0 ? (
            <span className="inline-flex flex-wrap gap-1 align-middle">
              {user.tags.map((tag) => (
                <span
                  key={`${user.id}-${tag}`}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                >
                  {tag}
                </span>
              ))}
            </span>
          ) : (
            <span className="font-semibold text-slate-800">-</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate(`/users/${user.id}`)}
          className="mt-2 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:-translate-y-0.5 transition"
        >
          View profile
        </button>
      </div>

      <div className="absolute right-4 bottom-4 flex flex-col items-center gap-1">
        <div className="flex flex-col items-center text-xs font-semibold text-slate-700">
          <span className={isMatch ? "text-brand" : "text-slate-700"}>
            {isMatch ? "Match" : liked ? "Liked" : "Like"}
          </span>
        </div>
        <button
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-brand to-brand-deep shadow-md shadow-orange-200 transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${liked ? "ring-2 ring-brand/60" : ""}`}
          onClick={handleToggleLike}
          disabled={loading || user.id === currentUser.id || (!liked && !canLikeProfiles)}
          aria-label={liked ? "Remove like" : "Like this user"}
          title={
            !liked && !canLikeProfiles
              ? "Add a profile picture first"
              : liked
                ? "Unlike"
                : "Like"
          }
        >
          <FaHeart
            color={liked ? "#fff" : "#fff"}
            style={{ stroke: liked ? "#fff" : "#0f172a" }}
            size={24}
          />
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default UserCard;
