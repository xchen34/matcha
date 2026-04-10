import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FaFire } from "react-icons/fa";
import { buildApiHeaders } from "../utils.js";
import { onRealtimeEvent } from "../realtime/socket.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

function MyPopularityPage({ currentUser }) {
  const navigate = useNavigate();
  const [fameRating, setFameRating] = useState(0);
  const [viewsList, setViewsList] = useState([]);
  const [likesList, setLikesList] = useState([]);
  const [matchesList, setMatchesList] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const fetchPopularity = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");

    try {
      const [viewsRes, likesRes, matchesRes, meRes, blockedRes] = await Promise.all([
        fetch("/api/profile/views", { headers: buildApiHeaders(currentUser) }),
        fetch("/api/profile/likes", { headers: buildApiHeaders(currentUser) }),
        fetch("/api/profile/matches", { headers: buildApiHeaders(currentUser) }),
        fetch("/api/profile/me", { headers: buildApiHeaders(currentUser) }),
        fetch("/api/moderation/blocked-users", { headers: buildApiHeaders(currentUser) }),
      ]);

      const [viewsData, likesData, matchesData, meData, blockedData] = await Promise.all([
        viewsRes.json().catch(() => ({})),
        likesRes.json().catch(() => ({})),
        matchesRes.json().catch(() => ({})),
        meRes.json().catch(() => ({})),
        blockedRes.json().catch(() => ({})),
      ]);

      setViewsList(viewsRes.ok && Array.isArray(viewsData.users) ? viewsData.users : []);
      setLikesList(likesRes.ok && Array.isArray(likesData.users) ? likesData.users : []);
      setMatchesList(matchesRes.ok && Array.isArray(matchesData.users) ? matchesData.users : []);
      setFameRating(Math.floor(Number(meData.profile?.fame_rating || 0)));
      setBlockedUsers(Array.isArray(blockedData.users) ? blockedData.users : []);
    } catch {
      setError("Failed to load popularity data");
      setViewsList([]);
      setLikesList([]);
      setMatchesList([]);
      setBlockedUsers([]);
      setFameRating(0);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchPopularity();
  }, [fetchPopularity]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const offNotificationCreated = onRealtimeEvent(
      "notification:created",
      (payload) => {
        const incoming = payload?.notification;
        if (!incoming || Number(incoming.user_id) !== Number(currentUser.id)) {
          return;
        }

        const realtimeRelevantTypes = new Set([
          "profile_view",
          "like_received",
          "match",
          "unlike",
        ]);

        if (!realtimeRelevantTypes.has(incoming.type)) {
          return;
        }

        fetchPopularity();
      },
    );

    return () => {
      offNotificationCreated();
    };
  }, [currentUser?.id, fetchPopularity]);

  async function handleUnblockUser(userId) {
    if (!currentUser) return;
    setActionMessage("");

    try {
      const response = await fetch(`/api/users/${userId}/block`, {
        method: "DELETE",
        headers: buildApiHeaders(currentUser),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionMessage(payload.error || "Failed to unblock user.");
        return;
      }

      setBlockedUsers((prev) => prev.filter((user) => String(user.id) !== String(userId)));
      setActionMessage("User unblocked successfully.");
    } catch {
      setActionMessage("Failed to unblock user.");
    }
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading popularity...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Popularity
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">My popularity</h2>
        <p className="text-sm text-slate-500">Who viewed me, who liked me, and who matched with me</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-brand-deep text-white shadow-md shadow-orange-200/60">
            <FaFire size={22} />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Fame note
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{fameRating}</p>
            <p className="text-xs text-slate-500">hot score (recent activity)</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Who viewed me
          </p>
          <p className="mt-2 text-3xl font-bold">{viewsList.length}</p>
          <p className="text-xs text-white/70">people have opened your profile</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-brand-deep p-4 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Who liked me
          </p>
          <p className="mt-2 text-3xl font-bold">{likesList.length}</p>
          <p className="text-xs text-white/80">users liked your profile</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-emerald-700 p-4 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            Who matched with me
          </p>
          <p className="mt-2 text-3xl font-bold">{matchesList.length}</p>
          <p className="text-xs text-white/80">mutual likes</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Who viewed me
              </p>
              <p className="mt-2 text-sm text-white/80">Latest profile visitors</p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {viewsList.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {viewsList.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-5 text-center text-white/70">
                No views yet.
              </div>
            )}
            {viewsList.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 backdrop-blur"
              >
                <div>
                  <p className="font-semibold text-white">@{user.username}</p>
                  <p className="text-xs text-white/70">Viewed your profile</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/users/${user.id}`)}
                  className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  View profile
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand via-brand/90 to-brand-deep p-5 text-white shadow-lg shadow-orange-200/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Who liked me
              </p>
              <p className="mt-2 text-sm text-white/85">People who liked your profile</p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {likesList.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {likesList.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-5 text-center text-white/70">
                No likes yet.
              </div>
            )}
            {likesList.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 backdrop-blur"
              >
                <div>
                  <p className="font-semibold text-white">@{user.username}</p>
                  <p className="text-xs text-white/70">Liked your profile</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/users/${user.id}`)}
                  className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  View profile
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-700 to-teal-700 p-5 text-white shadow-lg shadow-emerald-200/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Who matched with me
              </p>
              <p className="mt-2 text-sm text-white/85">People who liked you back</p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {matchesList.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {matchesList.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-5 text-center text-white/70">
                No matches yet.
              </div>
            )}
            {matchesList.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 backdrop-blur"
              >
                <div>
                  <p className="font-semibold text-white">@{user.username}</p>
                  <p className="text-xs text-white/70">You matched together</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/users/${user.id}`)}
                  className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  View profile
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Blocked users
            </p>
            <p className="mt-2 text-sm text-slate-600">
              You can unblock someone here if you blocked them by mistake.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {blockedUsers.length}
          </span>
        </div>

        {actionMessage && <p className="mt-3 text-sm text-red-600">{actionMessage}</p>}

        <div className="mt-4 space-y-2">
          {blockedUsers.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-slate-600">
              No blocked users.
            </div>
          )}

          {blockedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-semibold text-slate-900">@{user.username}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => handleUnblockUser(user.id)}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MyPopularityPage;
