import { FaHeart } from "react-icons/fa";

import React, { useEffect, useState } from "react";
import "./UserCard.css";

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
    <div className="user-card">
      <h3>@{user.username}</h3>
        <p>Email: <b>{user.email}</b></p>
        <p>Age: {user.age !== undefined && user.age !== null ? <b>{user.age}</b> : <b>-</b>} years old</p>
        <p>City: <b>{user.city || "-"}</b></p>
      <div className="like-container">
          {(!liked || isMatch) && (
              <div className="like-match-labels">
                {!liked && <span style={{ fontWeight: 500, color: '#000' }}>Like</span>}
                {isMatch && <span className="match">Match!</span>}
              </div>
          )}
        <button
          className={"like-btn" + (liked ? " liked" : "")}
          onClick={handleToggleLike}
          disabled={loading || user.id === currentUser.id}
          aria-label={liked ? "Remove like" : "Like this user"}
          title={liked ? "Unlike" : "Like"}
          >
          <span className="heart">
            <FaHeart
              color={liked ? "#e74c3c" : "#fff"}
              style={{ stroke: liked ? "#e74c3c" : "#000"}}
              size={28}
              />
          </span>
        </button>
        </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default UserCard;
