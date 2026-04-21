import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import ChatAvatar from "../chat/ChatAvatar.jsx";
import { onRealtimeEvent } from "../realtime/socket.js";
import { REALTIME_EVENTS } from "../realtime/events.js";
import { sanitizeText } from "../utils/xssEscape.js";
import { fetchChatConversations } from "../chat/api.js";
import { formatQuotedMessagePreview } from "../chat/quoteUtils.js";

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const now = Date.now();
  const diffMinutes = Math.floor((now - date.getTime()) / 60000);
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffMinutes < 24 * 60) {
    return `${Math.floor(diffMinutes / 60)}h ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function ChatListPage({ currentUser, embedded = false }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const lastMarkedConversationRef = useRef(null);
  const knownConversationIdsRef = useRef(new Set());
  const markId = Number(location.state?.markAsReadConversationId) || null;
  const removedConversationId =
    Number(location.state?.removedConversationId) || null;
  const shouldScrollList = conversations.length >= 8;

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    knownConversationIdsRef.current = new Set(
      conversations.map((conv) => Number(conv.conversation_id)).filter(Number.isInteger),
    );
  }, [conversations]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    const off = onRealtimeEvent("chat:message:created", (payload) => {
      const message = payload?.message;
      const conversationId = Number(message?.conversation_id);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return;
      }

      const senderUserId = Number(message?.sender_user_id);
      const recipientUserId = Number(message?.recipient_user_id);
      if (!Number.isInteger(senderUserId) || !Number.isInteger(recipientUserId)) {
        return;
      }

      if (!knownConversationIdsRef.current.has(conversationId)) {
        void loadConversations();
        return;
      }

      setConversations((prev) => {
        const targetIndex = prev.findIndex(
          (conv) => Number(conv.conversation_id) === conversationId,
        );

        if (targetIndex === -1) {
          return prev;
        }

        const target = prev[targetIndex];
        const unreadIncrement = recipientUserId === Number(currentUser.id) ? 1 : 0;

        const updated = {
          ...target,
          last_message: {
            sender_user_id: senderUserId,
            content: String(message?.content || ""),
            created_at: message?.created_at,
          },
          unread_count: Math.max(0, Number(target.unread_count || 0) + unreadIncrement),
        };

        return [updated, ...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
      });
    });
    return () => {
      off();
    };
  }, [currentUser?.id, loadConversations]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const offRead = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_CONVERSATION_READ,
      (payload) => {
        const conversationId = Number(payload?.conversation_id);
        const readerUserId = Number(payload?.reader_user_id);
        if (!Number.isInteger(conversationId) || conversationId <= 0) return;
        if (Number(readerUserId) !== Number(currentUser.id)) return;

        setConversations((prev) =>
          prev.map((conv) =>
            Number(conv.conversation_id) === conversationId
              ? { ...conv, unread_count: 0 }
              : conv,
          ),
        );
      },
    );

    const offBlockStatusChanged = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
      (payload) => {
        const userA = Number(payload?.user_a_id);
        const userB = Number(payload?.user_b_id);
        if (!Number.isInteger(userA) || !Number.isInteger(userB)) return;
        if (Number(currentUser.id) !== userA && Number(currentUser.id) !== userB) {
          return;
        }

        // Source of truth comes from API flags (blocked_by_you/blocked_you).
        void loadConversations();
      },
    );

    return () => {
      offRead();
      offBlockStatusChanged();
    };
  }, [currentUser?.id, loadConversations]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const offMessageDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_MESSAGE_DELETED,
      (payload) => {
        const conversationId = Number(payload?.conversation_id);
        const eventUserId = Number(payload?.user_id);
        if (!Number.isInteger(conversationId) || conversationId <= 0) return;
        if (Number.isInteger(eventUserId) && Number(eventUserId) !== Number(currentUser.id)) {
          return;
        }
        void loadConversations();
      },
    );
    const offConversationDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_CONVERSATION_DELETED,
      (payload) => {
        const conversationId = Number(payload?.conversation_id);
        const eventUserId = Number(payload?.user_id);
        if (!Number.isInteger(conversationId) || conversationId <= 0) return;
        if (Number.isInteger(eventUserId) && Number(eventUserId) !== Number(currentUser.id)) {
          return;
        }
        setConversations((prev) =>
          prev.filter((conv) => Number(conv.conversation_id) !== conversationId),
        );
      },
    );

    return () => {
      offMessageDeleted();
      offConversationDeleted();
    };
  }, [currentUser?.id, loadConversations]);

  useEffect(() => {
    if (!removedConversationId) return;
    setConversations((prev) =>
      prev.filter(
        (conv) => Number(conv.conversation_id) !== Number(removedConversationId),
      ),
    );
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, removedConversationId]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const offPresenceUpdate = onRealtimeEvent("presence:update", (payload) => {
      const targetUserId = Number(payload?.user_id);
      if (!Number.isInteger(targetUserId)) return;

      setConversations((prev) =>
        prev.map((conv) =>
          Number(conv.other_user?.id) === targetUserId
            ? {
                ...conv,
                other_user: {
                  ...conv.other_user,
                  is_online: Boolean(payload.is_online),
                  last_seen_at: payload.last_seen_at || conv.other_user.last_seen_at,
                },
              }
            : conv,
        ),
      );
    });

    return () => {
      offPresenceUpdate();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!markId) return;

    setConversations((prev) =>
      prev.map((conv) =>
        Number(conv.conversation_id) === markId
          ? { ...conv, unread_count: 0 }
          : conv,
      ),
    );
    lastMarkedConversationRef.current = markId;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, markId, navigate]);

  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }

  const emptyState = !loading && conversations.length === 0;



  return (
    <section className={embedded ? "space-y-4" : "space-y-6"}>
      {!embedded && (
        <header>
          <h2 className="text-3xl font-bold text-slate-900">Direct Messages</h2>
          <p className="text-sm text-slate-500">
            Reach out to anyone you are connected with. Chats are end-to-end in this interface.
          </p>
        </header>
      )}

      {error && (
        <p className="text-sm text-amber-600">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-slate-500">Loading messages...</p>
      )}

      <div
        className={
          shouldScrollList
            ? `max-h-[calc(100vh-16rem)] overflow-y-auto pr-1 ${embedded ? "scrollbar-gutter-stable" : ""}`
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

            const displayName = sanitizeText(
              conv.other_user.first_name ||
              conv.other_user.username ||
              `User ${conv.other_user.id}`
            );

            return (
              <li key={conv.conversation_id}>
                <Link
                  to={`/messages/${conv.conversation_id}`}
                  className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm transition hover:border-slate-300 ${
                    embedded ? "p-3" : "p-4"
                  }`}
                >
                  <ChatAvatar
                    name={displayName}
                    photoUrl={conv.other_user.primary_photo_url}
                    isOnline={Boolean(conv.other_user.is_online)}
                  />
                  {/* Croix supprimée ici, bouton uniquement à droite du temps */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
                        {displayName}
                        {conv.blocked_by_you && (
                          <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Blocked</span>
                        )}
                        {conv.blocked_you && (
                          <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Blocked you</span>
                        )}
                        {conv.is_match === false && (
                          <span className="ml-1 rounded-full border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">Unmatched</span>
                        )}
                        {conv.is_match === true && !conv.blocked_by_you && !conv.blocked_you && (
                          <span className="ml-1 rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Matched</span>
                        )}
                      </p>
                    </div>
                    <p className="text-slate-500">
                      {messagePreview}
                    </p>
                  </div>
                  <div className="flex min-w-[48px] flex-col items-end gap-2 text-right">
                    <div className="flex items-center gap-2">
                      {lastMessageTime && (
                        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">
                          {lastMessageTime}
                        </span>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[0.65rem] font-semibold text-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>



      {emptyState && (
        <p className="text-sm text-slate-500">
          No conversations yet. Once you match with someone, your chat history will appear here.
        </p>
      )}
    </section>
  );
}
