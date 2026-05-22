import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import ChatAvatar from "./components/ChatAvatar.jsx";
import { fetchChatConversations } from "./hooks/api.js";
import { formatQuotedMessagePreview } from "./hooks/quoteUtils.js";
import { toDisplayHandle, toAvatarName } from "./utils/chatIndicatorUtils.js";
import { formatTimestamp } from "./utils/messageFormat.js";
import { useChatListRealtime } from "./hooks/useChatListRealtime.js";
import { LoaderCircle } from "lucide-react";

const POLL_INTERVAL_MS = 15000;

export default function ChatListPage({ currentUser, embedded = false }) {
  /* ============= State ============= */
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  
  /* ============= Conversation ID tracking for realtime updates ============= */
  const markId = Number(location.state?.markAsReadConversationId) || null;
  const removedConversationId =
    Number(location.state?.removedConversationId) || null;
  const shouldScrollList = conversations.length >= 8;

  /* ============= Data loading ============= */
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) {
      setConversations([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchChatConversations(currentUser);
      setConversations(
        Array.isArray(data.conversations) ? data.conversations : [],
      );
    } catch (err) {
      setError(err?.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /* ============= Initial load & polling ============= */
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const intervalId = window.setInterval(loadConversations, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadConversations]);

  /* ============= Realtime updates ============= */
  useChatListRealtime({
    currentUserId: currentUser?.id,
    conversations,
    setConversations,
    loadConversations,
    markId,
    removedConversationId,
  });

  /* ============= Redirect if not logged in ============= */
  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }

  const emptyState = !loading && conversations.length === 0;

  return (
    <section className={embedded ? "space-y-4" : "space-y-6"}>
      { /* Header */}
      {!embedded && (
        <header>
          <h2 className="text-3xl font-bold text-neutral-dark">Direct Messages</h2>
          <p className="text-sm text-slate-500">
            Reach out to anyone you are connected with. Chats are end-to-end in this interface.
          </p>
        </header>
      )}

      { /* Error message */}
      {error && (
        <p className="text-sm text-primary-dark">
          {error}
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-sm text-slate-500 inline-flex items-center gap-1.5">
          <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
          Loading messages...
        </div>
      )}

      {/* Conversation list */}
      <div
        className={
          shouldScrollList
            ? `max-h-[calc(100vh-16rem)] overflow-y-auto pr-1 ${
                embedded ? "scrollbar-gutter-stable" : ""
              }`
            : undefined
        }
      >
        <ul className={embedded ? "space-y-2" : "space-y-3"}>
          {conversations.map((conv) => {
            const messagePreview = formatQuotedMessagePreview(
              conv.last_message?.content || "No messages yet",
              80,
            );
            const lastMessageTime = formatTimestamp(conv.last_message?.created_at);
            const displayName = toDisplayHandle(conv.other_user);
            const avatarName = toAvatarName(conv.other_user);
            
            /* Status badge */
            const statusBadge = conv.blocked_by_you ? (
              <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                Blocked
              </span>
            ) : conv.blocked_you ? (
              <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                Blocked you
              </span>
            ) : conv.is_match === false ? (
              <span className="ml-1 rounded-full border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
                Unmatched
              </span>
            ) : conv.is_match === true ? (
              <span className="ml-1 rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                Matched
              </span>
            ) : null;

            return (
              <li key={conv.conversation_id}>
                <Link
                  to={`/messages/${conv.conversation_id}`}
                  className={`
                    group flex items-center gap-3
                    rounded-2xl border border-slate-200
                    bg-white/80 backdrop-blur-md
                    shadow-sm
                    transition-all duration-200
                    hover:shadow-md hover:-translate-y-[1px]
                    hover:border-primary-medium
                    ${embedded ? "p-3" : "p-4"}
                  `}
                >
                  {/* AVATAR */}
                  <div className="shrink-0 transition-transform duration-200 group-hover:scale-[1.03]">
                    <ChatAvatar
                      name={avatarName}
                      photoUrl={conv.other_user.primary_photo_url || ""}
                      isOnline={Boolean(conv.other_user.is_online)}
                    />
                  </div>

                  {/* MAIN CONTENT */}
                  <div className="min-w-0 flex-1">
                    {/* Left */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Usename + badge */}
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="truncate text-base font-semibold text-neutral-dark">
                          {displayName}
                        </p>

                        {statusBadge && (
                          <span className="shrink-0">
                            {statusBadge}
                          </span>
                        )}
                      </div>
                      {/* Message time */}
                      {lastMessageTime && (
                        <span className="shrink-0 text-[10px] uppercase tracking-widest text-slate-400">
                          {lastMessageTime}
                        </span>
                      )}
                    </div>

                    {/* Right */}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {/* Message preview */}
                      <p className="truncate text-sm text-slate-500">
                        {messagePreview}
                      </p>

                      {/* Unread count */}
                      {conv.unread_count > 0 && (
                        <span
                          className="
                            flex h-5 min-w-5 items-center justify-center
                            rounded-full bg-red-600
                            px-1 text-[10px] font-bold text-white
                          "
                        >
                          {conv.unread_count > 99 ? "99+" : conv.unread_count}
                        </span>
                      )}
                    </div>

                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Empty state */}
      {emptyState && (
        <p className="text-sm text-slate-500">
          No conversations yet. Once you match with someone, your chat history will appear here.
        </p>
      )}
    </section>
  );
}
