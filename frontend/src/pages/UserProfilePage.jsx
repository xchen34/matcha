import { useEffect, useRef, useState } from "react";
import { FaHeart } from "react-icons/fa";
import { Navigate, useParams } from "react-router-dom";
import { buildApiHeaders } from "../utils.js";
import { onRealtimeEvent } from "../realtime/socket.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

function UserProfilePage({ currentUser }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reportedFake, setReportedFake] = useState(false);
  const [blockedUser, setBlockedUser] = useState(false);
  const [moderationMessage, setModerationMessage] = useState("");
  const [liked, setLiked] = useState(false);
  const [likedByProfile, setLikedByProfile] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [likeError, setLikeError] = useState("");
  const [canLikeProfiles, setCanLikeProfiles] = useState(false);
  const lastRecordedViewRef = useRef("");

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/profile/${id}`, {
          headers: buildApiHeaders(currentUser),
        });
        const payload = await response.json();
        if (!response.ok) {
          setError(payload.error || "Failed to load profile");
          setLoading(false);
          return;
        }
        setData(payload);
        if (payload?.relation) {
          setLiked(Boolean(payload.relation.i_liked));
          setLikedByProfile(Boolean(payload.relation.liked_me));
          setIsMatch(Boolean(payload.relation.is_match));
        }
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    async function recordView() {
      if (!currentUser?.id || !id || String(currentUser.id) === String(id)) return;

      const viewKey = `${currentUser.id}:${id}`;
      const now = Date.now();
      const storageKey = `matcha.lastProfileView.${viewKey}`;
      const lastRecordedAt = Number(sessionStorage.getItem(storageKey) || 0);
      if (lastRecordedViewRef.current === viewKey && now - lastRecordedAt < 3000) {
        return;
      }

      lastRecordedViewRef.current = viewKey;
      sessionStorage.setItem(storageKey, String(now));

      fetch(`/api/users/${id}/view`, {
        method: "POST",
        headers: buildApiHeaders(currentUser),
      }).catch(() => {});
    }

    async function fetchModerationStatus() {
      if (!currentUser?.id || !id || String(currentUser.id) === String(id)) return;
      try {
        const response = await fetch(`/api/users/${id}/moderation-status`, {
          headers: buildApiHeaders(currentUser),
        });
        const payload = await response.json();
        if (!response.ok) return;
        setReportedFake(Boolean(payload.reported_fake));
        setBlockedUser(Boolean(payload.blocked));
      } catch {
        setReportedFake(false);
        setBlockedUser(false);
      }
    }

    async function fetchLikeState() {
      if (!currentUser?.id || !id || String(currentUser.id) === String(id)) return;

      try {
        const [likeResponse, matchResponse, meResponse] = await Promise.all([
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

        const likePayload = await likeResponse.json().catch(() => ({}));
        const matchPayload = await matchResponse.json().catch(() => ({}));
        const mePayload = await meResponse.json().catch(() => ({}));

        setLiked(Boolean(likeResponse.ok && likePayload?.liked));
        setIsMatch(Boolean(matchResponse.ok && matchPayload?.is_match));
        setCanLikeProfiles(
          Array.isArray(mePayload?.profile?.photos) &&
            mePayload.profile.photos.some((photo) => photo.is_primary),
        );
      } catch {
        setLiked(false);
        setIsMatch(false);
        setCanLikeProfiles(false);
      }
    }

    if (id) {
      fetchProfile();
      recordView();
      fetchModerationStatus();
      fetchLikeState();
    }
  }, [id, currentUser]);

  useEffect(() => {
    if (!id) return undefined;

    const viewedUserId = Number(id);
    if (!Number.isInteger(viewedUserId)) return undefined;

    const offPresenceUpdate = onRealtimeEvent("presence:update", (payload) => {
      const targetUserId = Number(payload?.user_id);
      if (targetUserId !== viewedUserId) return;

      setData((prev) => {
        if (!prev || !prev.user) return prev;
        return {
          ...prev,
          user: {
            ...prev.user,
            is_online: Boolean(payload.is_online),
            last_seen_at: payload.last_seen_at || prev.user.last_seen_at,
          },
        };
      });
    });

    return () => {
      offPresenceUpdate();
    };
  }, [id]);

  useEffect(() => {
    if (!id || !currentUser?.id) return undefined;

    const viewedUserId = Number(id);
    if (!Number.isInteger(viewedUserId)) return undefined;

    const offNotificationCreated = onRealtimeEvent(
      "notification:created",
      (payload) => {
        const incoming = payload?.notification;
        if (!incoming) return;
        if (Number(incoming.user_id) !== Number(currentUser.id)) return;
        if (Number(incoming.actor_user_id) !== viewedUserId) return;

        if (incoming.type === "match") {
          setLiked(true);
          setLikedByProfile(true);
          setIsMatch(true);
          return;
        }

        if (incoming.type === "like_received") {
          setLikedByProfile(true);
          return;
        }

        if (incoming.type === "unlike") {
          setLikedByProfile(false);
          setIsMatch(false);
        }
      },
    );

    return () => {
      offNotificationCreated();
    };
  }, [id, currentUser?.id]);

  async function handleReportSubmit(event) {
    event.preventDefault();

    const reason = reportReason.trim();
    if (reason.length < 5) {
      setModerationMessage("Please provide a valid report reason (minimum 5 characters).");
      return;
    }

    setReporting(true);
    setModerationMessage("");
    try {
      const response = await fetch(`/api/users/${id}/report-fake`, {
        method: "POST",
        headers: {
          ...buildApiHeaders(currentUser),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setModerationMessage(payload.error || "Failed to submit report.");
        return;
      }

      setReportedFake(true);
      setShowReportForm(false);
      setMenuOpen(false);
      setModerationMessage("This account has been reported successfully. Under review.");
    } catch {
      setModerationMessage("Failed to submit report.");
    } finally {
      setReporting(false);
    }
  }

  async function handleBlockUser() {
    setBlocking(true);
    setModerationMessage("");
    try {
      const response = await fetch(`/api/users/${id}/block`, {
        method: "POST",
        headers: buildApiHeaders(currentUser),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setModerationMessage(payload.error || "Failed to block user.");
        return;
      }
      setBlockedUser(true);
      setMenuOpen(false);
      setModerationMessage("This user has been blocked successfully. They will no longer appear in search results or trigger notifications.");
    } catch {
      setModerationMessage("Failed to block user.");
    } finally {
      setBlocking(false);
    }
  }

  async function handleToggleLike() {
    if (!currentUser?.id || isOwnProfile) return;

    setLoadingLike(true);
    setLikeError("");
    try {
      if (!liked && !canLikeProfiles) {
        throw new Error("Add a profile picture first to like users.");
      }

      if (!liked) {
        const response = await fetch(`/api/users/${id}/like`, {
          method: "POST",
          headers: buildApiHeaders(currentUser),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const alreadyLikedMessages = ["Already liked", "Déjà liké", "Deja like"];
          if (!alreadyLikedMessages.includes(payload.message)) {
            throw new Error(payload.error || "Error while liking");
          }
        }
        setLiked(true);
      } else {
        const response = await fetch(`/api/users/${id}/like`, {
          method: "DELETE",
          headers: buildApiHeaders(currentUser),
        });
        if (!response.ok) {
          throw new Error("Error when unliking");
        }
        setLiked(false);
        setIsMatch(false);
      }

      const matchResponse = await fetch(`/api/users/${id}/is-match`, {
        headers: buildApiHeaders(currentUser),
      });
      const matchPayload = await matchResponse.json().catch(() => ({}));
      setIsMatch(Boolean(matchPayload?.is_match));
    } catch (error) {
      setLikeError(error?.message || "Network error");
    } finally {
      setLoadingLike(false);
    }
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading profile...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const { user, profile } = data;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const isOwnProfile = String(currentUser?.id || "") === String(user.id);
  const relationLabel = isMatch
    ? "Match"
    : likedByProfile
      ? "Liked you"
      : liked
        ? "You liked"
        : "Not liked";

  function formatLastSeen(value) {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Profile
        </p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              {fullName || `@${user.username}`}
            </h2>
            <p className="text-sm text-slate-500">@{user.username}</p>
          </div>

          {!isOwnProfile && (
            <div className="relative flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isMatch ? "bg-red-600 text-white" : likedByProfile ? "bg-pink-100 text-pink-700" : liked ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}
              >
                {relationLabel}
              </span>

              <button
                type="button"
                onClick={handleToggleLike}
                disabled={loadingLike || user.id === currentUser.id || (!liked && !canLikeProfiles)}
                aria-label={isMatch ? "Disconnect from this profile" : liked ? "Remove like" : "Like this user"}
                title={
                  !liked && !canLikeProfiles
                    ? "Add a profile picture first"
                    : isMatch
                      ? "Disconnect"
                      : liked
                        ? "Unlike"
                      : "Like"
                }
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${isMatch ? "border-red-700 bg-red-600 shadow-md shadow-red-200" : liked ? "border-orange-300 bg-gradient-to-br from-orange-500 to-brand-deep shadow-md shadow-orange-200 ring-2 ring-orange-300/60" : "border-slate-300 bg-slate-200 text-slate-700"}`}
              >
                {isMatch ? (
                  <span className="relative inline-flex h-4 w-5 items-center justify-center">
                    <FaHeart size={12} className="absolute left-0 text-white" />
                    <FaHeart size={12} className="absolute right-0 text-white" />
                  </span>
                ) : (
                  <FaHeart
                    color={liked ? "#fff" : "#fff"}
                    style={{ stroke: liked ? "#fff" : "#fff" }}
                    size={16}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="Open actions menu"
              >
                ...
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportForm(true);
                      setMenuOpen(false);
                    }}
                    disabled={reportedFake}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reportedFake ? "Fake account already reported" : "Report fake account"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBlockUser}
                    disabled={blocking || blockedUser}
                    className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {blockedUser ? "User already blocked" : blocking ? "Blocking..." : "Block user"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showReportForm && !isOwnProfile && (
        <form onSubmit={handleReportSubmit} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Reason for reporting
          </label>
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            rows={4}
            placeholder="Explain why this profile looks fake"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={reporting}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {reporting ? "Submitting..." : "Submit report"}
            </button>
            <button
              type="button"
              onClick={() => setShowReportForm(false)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {moderationMessage && (
        <p className="text-sm text-red-600">{moderationMessage}</p>
      )}

      {likeError && <p className="text-sm text-red-600">{likeError}</p>}

      {Array.isArray(profile.photos) && profile.photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {profile.photos.map((photo) => (
            <div
              key={photo.id}
              className={`overflow-hidden rounded-xl border ${photo.is_primary ? "border-brand" : "border-slate-200"}`}
            >
              <img
                src={photo.data_url}
                alt="Profile"
                className="h-32 w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
        <div>
          <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Bio
          </span>
          <p className="mt-1 text-slate-800">{profile.biography || "-"}</p>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Gender
            </span>
            <p className="mt-1 text-slate-800">{profile.gender || "-"}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Sexual preference
            </span>
            <p className="mt-1 text-slate-800">{profile.sexual_preference || "-"}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Age
            </span>
            <p className="mt-1 text-slate-800">
              {profile.age !== undefined && profile.age !== null ? profile.age : "-"}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Location
            </span>
            <p className="mt-1 text-slate-800">
              {profile.city || "-"} {profile.neighborhood ? `· ${profile.neighborhood}` : ""}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Status
            </span>
            <div className="mt-1 space-y-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.is_online ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
              >
                {user.is_online ? "Online" : "Offline"}
              </span>
              {!user.is_online && (
                <p className="text-sm text-slate-800">
                  Last connection: {formatLastSeen(user.last_seen_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {Array.isArray(profile.tags) && profile.tags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-slate-900 text-white text-xs px-2.5 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand/90 to-brand-deep p-5 text-white shadow-lg shadow-orange-200/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Fame rating
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-end gap-2">
          <span className="text-5xl font-bold leading-none">{Math.floor(profile.fame_rating ?? 0)}</span>
          <span className="pb-1 text-sm font-medium text-white/80"></span>
        </div>
        <p className="mt-3 text-xs text-white/70">
          This reflects how many users have liked and viewed this profile.
        </p>
      </div>
    </section>
  );
}

export default UserProfilePage;
