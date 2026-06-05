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

/**
 * Renders the popularity dashboard for views, likes, and matches.
 *
 * The page fetches the three popularity lists in parallel, keeps them updated
 * through realtime notification events, and wires the match list to chat
 * creation so the user can jump directly from a match to a conversation.
 */
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

  // Pick the correct array for the selected mode and keep the derived list
  // stable unless the source data changes.
  const users = useMemo(() => {
    const modeUsers = lists[mode];
    return Array.isArray(modeUsers) ? modeUsers : [];
  }, [lists, mode]);

  // Compute per-mode counters for the header so it can display totals without
  // recomputing inside the child component.
  const counts = useMemo(
    () => ({
      views: (lists.views || []).length,
      likes: (lists.likes || []).length,
      matches: (lists.matches || []).length,
    }),
    [lists],
  );

  // Show the newest interactions first, using interaction time as the primary
  // sort key and the user ID as a deterministic tiebreaker.
  const displayedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const timeDiff = getInteractionTimeMs(b, mode) - getInteractionTimeMs(a, mode);
      if (timeDiff !== 0) return timeDiff;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [mode, users]);

  // Load views, likes, and matches in parallel, then normalize each response
  // into the local state shape expected by the page.
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

  // Load once on mount and whenever the fetch function changes.
  useEffect(() => {
    void fetchLists();
  }, [fetchLists]);

  // Keep the popularity lists synced with incoming realtime notifications and
  // with the reconnect safety net inside the hook.
  useRealtimeNotifications(currentUser, fetchLists, setLists);

  // Create or reopen the conversation for a matched user, then navigate to
  // the chat thread if the backend returns a conversation ID.
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

  // Avoid rendering the dashboard for anonymous visitors.
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
