import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { onRealtimeEvent } from "../realtime/socket.js";
import { fetchChatConversations } from "../chat/api.js";

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

export default function ChatListPage({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const lastMarkedConversationRef = useRef(null);
  const markId = Number(location.state?.markAsReadConversationId) || null;

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
    if (!currentUser?.id) return undefined;
    const off = onRealtimeEvent("chat:message:created", () => {
      setTimeout(() => {
        loadConversations();
      }, 50);
    });
    return () => {
      off();
    };
  }, [currentUser?.id, loadConversations]);

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
    <section className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Direct Messages</h2>
        <p className="text-sm text-slate-500">
          Reach out to anyone you are connected with. Chats are end-to-end in this interface.
        </p>
      </header>

      {error && (
        <p className="text-sm text-amber-600">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-slate-500">Loading messages...</p>
      )}

      <ul className="space-y-3">
        {conversations.map((conv) => {
          const messagePreview = conv.last_message?.content || "No messages yet";
          const lastMessageTime = formatTimestamp(conv.last_message?.created_at);

          const displayName =
            conv.other_user.first_name ||
            conv.other_user.username ||
            `User ${conv.other_user.id}`;

          return (
            <li key={conv.conversation_id}>
              <Link
                to={`/messages/${conv.conversation_id}`}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm transition hover:border-slate-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-700">
                  {conv.other_user.primary_photo_url ? (
                    <img
                      src={conv.other_user.primary_photo_url}
                      alt={`${displayName} avatar`}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    displayName.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">{displayName}</p>
                    {conv.other_user.is_online && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white">
                        online
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {conv.last_message?.sender_user_id === currentUser.id ? "You" : displayName}:
                    </span>{" "}
                    {messagePreview.length > 80
                      ? `${messagePreview.slice(0, 80)}…`
                      : messagePreview}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  {lastMessageTime && (
                    <span className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">
                      {lastMessageTime}
                    </span>
                  )}
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

      {emptyState && (
        <p className="text-sm text-slate-500">
          No conversations yet. Once you match with someone, your chat history will appear here.
        </p>
      )}
    </section>
  );
}
