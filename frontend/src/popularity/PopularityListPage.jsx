import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { buildApiHeaders } from "@/utils/utils.js";
import { ensureConversationExists } from "../chat/hooks/api.js";
import { useNotifications } from "../notifications/hooks/useNotifications.js";
import { cardClass } from "../styles/UIClasses.jsx";
import { getInteractionTimeMs } from "../utils/date.js";
import { MODE_CONFIG } from "./utils/popularityUtils.js";
import useRealtimeNotifications from "./hooks/useRealtimeNotifications.js";
import UserList from "./components/UserList.jsx";
import PopularityListHeader from "./components/PopularityListHeader.jsx";
import { LoaderCircle } from "lucide-react";

function PopularityListPage({ currentUser, mode = "views" }) {
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

  /* Memoized list of users for the current mode */
  const users = useMemo(() => {
    const modeUsers = lists[mode];
    return Array.isArray(modeUsers) ? modeUsers : [];
  }, [lists, mode]);

  /* Counts number of users in each category */
  const counts = useMemo(
    () => ({
      views: (lists.views || []).length,
      likes: (lists.likes || []).length,
      matches: (lists.matches || []).length,
    }),
    [lists],
  );

  /* Sort users by interaction time descending */
  const displayedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const timeDiff = getInteractionTimeMs(b, mode) - getInteractionTimeMs(a, mode);
      if (timeDiff !== 0) return timeDiff;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [mode, users]);

  /* ========== Fetch lists ========== */
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

  /* ========== Realtime notifications ========== */
  useEffect(() => {
    void fetchLists();
  }, [fetchLists]);

  useRealtimeNotifications(currentUser, fetchLists, setLists);

  /* ========== Start chat with a user ========== */
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

  /* ============= Redirect if not logged in ============= */
  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }  
  return (
    <section className={`${cardClass} w-full`}>
      {/* Header with counts */}
      <PopularityListHeader config={config} mode={mode} counts={lists} />

      {/* Loading / error / user list */}
      <div className="min-h-[120px]">
        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
            Loading...
          </p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <UserList
            users={lists[mode]}
            mode={mode}
            unreadUserSet={unreadUserSet}
            startingChatFor={startingChatFor}
            startChatWith={startChatWith}
            navigate={navigate}
            config={config}
          />
        )}
      </div>
    </section>
  );
}

export default PopularityListPage;