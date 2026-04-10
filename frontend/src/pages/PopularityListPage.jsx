import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { buildApiHeaders } from "../utils.js";
import { ensureConversationExists } from "../chat/api.js";
import { useNotifications } from "../notifications/useNotifications.js";
import { getRealtimeSocket, onRealtimeEvent } from "../realtime/socket.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

const MODE_CONFIG = {
  views: {
    title: "Who viewed me",
    subtitle: "People who opened your profile.",
    endpoint: "/api/profile/views",
    emptyText: "No views yet.",
    helperText: "Viewed your profile",
  },
  likes: {
    title: "Who liked me",
    subtitle: "People who liked your profile.",
    endpoint: "/api/profile/likes",
    emptyText: "No likes yet.",
    helperText: "Liked your profile",
  },
  matches: {
    title: "Who matched with me",
    subtitle: "People who liked you back.",
    endpoint: "/api/profile/matches",
    emptyText: "No matches yet.",
    helperText: "Mutual like",
  },
};

function getInteractionTimeMs(user, mode) {
  const rawValue = mode === "matches" ? user?.matched_at : user?.created_at;
  const ts = new Date(rawValue || 0).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function upsertUserById(list, user, mode) {
  const userId = Number(user?.id);
  if (!Number.isInteger(userId) || userId <= 0) return list;

  const timeField = mode === "matches" ? "matched_at" : "created_at";
  const incomingTs = new Date(user?.[timeField] || 0).getTime();
  const idx = list.findIndex((item) => Number(item?.id) === userId);

  if (idx < 0) {
    return [user, ...list];
  }

  const next = [...list];
  const current = next[idx] || {};
  const currentTs = new Date(current?.[timeField] || 0).getTime();
  next[idx] = {
    ...current,
    ...user,
    [timeField]:
      Number.isFinite(incomingTs) && incomingTs >= currentTs
        ? user?.[timeField]
        : current?.[timeField],
  };
  return next;
}

function removeUserById(list, userId) {
  const parsed = Number(userId);
  if (!Number.isInteger(parsed) || parsed <= 0) return list;
  return list.filter((item) => Number(item?.id) !== parsed);
}

function PopularityListPage({ currentUser, mode = "views" }) {
  const ROLLING_THRESHOLD = 8;
  const navigate = useNavigate();
  const [lists, setLists] = useState({ views: [], likes: [], matches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingChatFor, setStartingChatFor] = useState(null);
  const { attentionUsersByMode = {} } = useNotifications();

  const config = useMemo(() => MODE_CONFIG[mode] || MODE_CONFIG.views, [mode]);
  const unreadUserSet = useMemo(() => {
    const set = attentionUsersByMode[mode];
    return set instanceof Set ? set : new Set();
  }, [mode, attentionUsersByMode]);

  const users = useMemo(() => {
    const modeUsers = lists[mode];
    return Array.isArray(modeUsers) ? modeUsers : [];
  }, [lists, mode]);

  const counts = useMemo(
    () => ({
      views: (lists.views || []).length,
      likes: (lists.likes || []).length,
      matches: (lists.matches || []).length,
    }),
    [lists],
  );

  const displayedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const timeDiff = getInteractionTimeMs(b, mode) - getInteractionTimeMs(a, mode);
      if (timeDiff !== 0) return timeDiff;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [mode, users]);

  const fetchLists = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");

    try {
      const [viewsRes, likesRes, matchesRes] = await Promise.all([
        fetch(MODE_CONFIG.views.endpoint, {
          headers: buildApiHeaders(currentUser),
        }),
        fetch(MODE_CONFIG.likes.endpoint, {
          headers: buildApiHeaders(currentUser),
        }),
        fetch(MODE_CONFIG.matches.endpoint, {
          headers: buildApiHeaders(currentUser),
        }),
      ]);

      const [viewsPayload, likesPayload, matchesPayload] = await Promise.all([
        viewsRes.json().catch(() => ({})),
        likesRes.json().catch(() => ({})),
        matchesRes.json().catch(() => ({})),
      ]);

      if (!viewsRes.ok || !likesRes.ok || !matchesRes.ok) {
        setLists({ views: [], likes: [], matches: [] });
        setError("Failed to load data.");
        return;
      }

      const viewsUsers = Array.isArray(viewsPayload.users)
        ? viewsPayload.users
        : [];
      const likesUsers = Array.isArray(likesPayload.users)
        ? likesPayload.users
        : [];
      const matchesUsers = Array.isArray(matchesPayload.users)
        ? matchesPayload.users
        : [];

      setLists({
        views: viewsUsers,
        likes: likesUsers,
        matches: matchesUsers,
      });
    } catch {
      setLists({ views: [], likes: [], matches: [] });
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [currentUser, mode]);

  useEffect(() => {
    void fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const offNotificationCreated = onRealtimeEvent("notification:created", (payload) => {
      const notification = payload?.notification;
      const type = notification?.type;
      if (!type || !["profile_view", "like_received", "unlike", "match"].includes(type)) {
        return;
      }

      const actorId = Number(notification?.actor_user_id);
      if (!Number.isInteger(actorId) || actorId <= 0) {
        return;
      }

      const baseUser = {
        id: actorId,
        username: notification?.actor_username || `user-${actorId}`,
        email: "",
      };

      setLists((prev) => {
        const next = {
          views: [...(prev.views || [])],
          likes: [...(prev.likes || [])],
          matches: [...(prev.matches || [])],
        };

        if (type === "profile_view") {
          next.views = upsertUserById(
            next.views,
            { ...baseUser, created_at: notification?.created_at },
            "views",
          );
          return next;
        }

        if (type === "like_received") {
          next.likes = upsertUserById(
            next.likes,
            { ...baseUser, created_at: notification?.created_at },
            "likes",
          );
          return next;
        }

        if (type === "unlike") {
          next.likes = removeUserById(next.likes, actorId);
          next.matches = removeUserById(next.matches, actorId);
          return next;
        }

        if (type === "match") {
          next.matches = upsertUserById(
            next.matches,
            { ...baseUser, matched_at: notification?.created_at },
            "matches",
          );
          return next;
        }

        return next;
      });
    });

    const socket = getRealtimeSocket();
    const syncOnReconnect = () => {
      void fetchLists();
    };
    socket.on("connect", syncOnReconnect);

    return () => {
      offNotificationCreated();
      socket.off("connect", syncOnReconnect);
    };
  }, [currentUser?.id, fetchLists]);

  const startChatWith = useCallback(
    async (userId) => {
      if (!currentUser?.id || !userId) return;
      setStartingChatFor(userId);
      setError("");
      try {
        const payload = await ensureConversationExists(currentUser, userId);
        const conversationId = payload?.conversation_id;
        if (conversationId) {
          navigate(`/messages/${conversationId}`);
          return;
        }
        setError("Unable to open conversation.");
      } catch (err) {
        setError(err.message);
      } finally {
        setStartingChatFor(null);
      }
    },
    [currentUser, navigate],
  );

  const renderActionButtons = (user) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(`/users/${user.id}`)}
        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
      >
        View profile
      </button>
      {mode === "matches" && (
        <button
          type="button"
          onClick={() => startChatWith(user.id)}
          disabled={startingChatFor === user.id}
          className="inline-flex items-center justify-center rounded-full border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {startingChatFor === user.id ? "Opening…" : "Chat"}
        </button>
      )}
    </div>
  );

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Popularity
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">{config.title}</h2>
        <p className="text-sm text-slate-500">{config.subtitle}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm w-full">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
          {mode === "views" && "My total views"}
          {mode === "likes" && "My total likes"}
          {mode === "matches" && "My total matches"}
        </p>
        <p className="mt-2 text-3xl font-bold">
          {mode === "views" && counts.views}
          {mode === "likes" && counts.likes}
          {mode === "matches" && counts.matches}
        </p>
      </div>

      <div className="space-y-2">
        {displayedUsers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-slate-600">
            {config.emptyText}
          </div>
        )}

        {mode === "views" && displayedUsers.length > ROLLING_THRESHOLD ? (
          <div className="popularity-rolling-shell">
            <div className="popularity-rolling-track">
              {[...displayedUsers, ...displayedUsers].map((user, index) => (
                <div
                  key={`${user.id}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="inline-flex items-center gap-1 font-semibold text-slate-900">
                      @{user.username}
                      {unreadUserSet.has(String(user.id)) && (
                        <span className="h-2 w-2 rounded-full bg-red-500" aria-label="New notification" />
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{config.helperText}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatDateTime(mode === "matches" ? user.matched_at : user.created_at)}
                    </p>
                  </div>
                  {renderActionButtons(user)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          displayedUsers.map((user) => (
            <div
              key={`${user.id}-${user.created_at ?? user.matched_at ?? mode}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="inline-flex items-center gap-1 font-semibold text-slate-900">
                  @{user.username}
                  {unreadUserSet.has(String(user.id)) && (
                    <span className="h-2 w-2 rounded-full bg-red-500" aria-label="New notification" />
                  )}
                </p>
                <p className="text-xs text-slate-500">{config.helperText}</p>
                <p className="text-[11px] text-slate-400">
                  {formatDateTime(mode === "matches" ? user.matched_at : user.created_at)}
                </p>
              </div>
              {renderActionButtons(user)}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default PopularityListPage;
