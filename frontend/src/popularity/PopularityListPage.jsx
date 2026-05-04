import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { buildApiHeaders } from "../utils.js";
import { ensureConversationExists } from "../chat/hooks/api.js";
import { useNotifications } from "../notifications/hooks/useNotifications.js";
import { cardClass } from "../styles/UIClasses.jsx";
import { getInteractionTimeMs } from "../utils/date.js";
import { MODE_CONFIG } from "./utils/popularityUtils.js";
import useRealtimeNotifications from "./hooks/useRealtimeNotifications.js";
import UserList from "./components/UserList.jsx";
import PopularityListHeader from "./components/PopularityListHeader.jsx";

function PopularityListPage({ currentUser, mode = "views" }) {
  // const ROLLING_THRESHOLD = 8;
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

  useRealtimeNotifications(currentUser, fetchLists, setLists);

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

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
  <section className={cardClass}>
    
    <PopularityListHeader config={config} mode={mode} counts={lists} />

    <UserList
        users={lists[mode]}
        mode={mode}
        unreadUserSet={unreadUserSet}
        startingChatFor={startingChatFor}
        startChatWith={startChatWith}
        navigate={navigate}
        config={config}
      />

  </section>
);
}

export default PopularityListPage;