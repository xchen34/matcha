import { FaHeart } from "react-icons/fa";

import React, { useEffect, useState } from "react";

function UserCard({ user, currentUser }) {
  const [liked, setLiked] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchLikeStatus() {
      try {
        const res = await fetch(`/api/users/${user.id}/like`, {
          headers: { "x-user-id": currentUser.id },
        });
        const data = await res.json();
        if (!cancelled) setLiked(!!data.liked);
      } catch {
        if (!cancelled) setLiked(false);
      }
    }
    async function fetchMatchStatus() {
      try {
        const res = await fetch(`/api/users/${user.id}/is-match`, {
          headers: { "x-user-id": currentUser.id },
        });
        const data = await res.json();
        if (!cancelled) setIsMatch(!!data.is_match);
      } catch {
        if (!cancelled) setIsMatch(false);
      }
    }
    if (user && currentUser) {
      fetchLikeStatus();
      fetchMatchStatus();
      if (user.id !== currentUser.id) {
        fetch(`/api/users/${user.id}/view`, {
          method: "POST",
          headers: { "x-user-id": currentUser.id },
        }).catch(() => {});
      }
    }
    return () => { cancelled = true; };
  }, [user, currentUser]);

  async function handleToggleLike() {
    setLoading(true);
    setError("");
    try {
      if (!liked) {
        // Like
        const res = await fetch(`/api/users/${user.id}/like`, {
          method: "POST",
          headers: { "x-user-id": currentUser.id },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.message !== "Already liked") throw new Error(data.error || "Error while liking");
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
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">@{user.username}</h3>
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
      </div>

      <div className="absolute right-4 bottom-4 flex flex-col items-center gap-1">
        {(!liked || isMatch) && (
          <div className="flex flex-col items-center text-xs font-semibold text-slate-700">
            {!liked && <span>Like</span>}
            {isMatch && <span className="text-brand">Match!</span>}
          </div>
        )}
        <button
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-brand to-brand-deep shadow-md shadow-orange-200 transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${liked ? "ring-2 ring-brand/60" : ""}`}
          onClick={handleToggleLike}
          disabled={loading || user.id === currentUser.id}
          aria-label={liked ? "Remove like" : "Like this user"}
          title={liked ? "Unlike" : "Like"}
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
