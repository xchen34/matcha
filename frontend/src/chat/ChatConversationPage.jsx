import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCornerUpLeft, FiTrash2 } from "react-icons/fi";
import ChatAvatar from "./components/ChatAvatar.jsx";
import {
  deleteChatConversation,
  deleteChatMessage,
  fetchConversationMessages,
  markConversationAsRead,
  sendChatMessage,
} from "./hooks/api.js";
import {
  joinConversationRoom,
  leaveConversationRoom,
  onRealtimeEvent,
} from "../realtime/socket.js";
import { REALTIME_EVENTS } from "../realtime/events.js";
import { chatButtonClass, chatInputClass } from "../styles/UIClasses.jsx";
import {
  dateKey,
  dedupeMessages,
  formatDayLabel,
  formatTime,
} from "./utils/messageFormat.js";

const PAGE_SIZE = 18;
const MAX_CHAT_MESSAGE_LENGTH = 1200;

export default function ChatConversationPage({ currentUser, embedded = false }) {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const currentUserId = Number(currentUser?.id) || null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [quotedMessage, setQuotedMessage] = useState(null);
  const [sending, setSending] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef(null);
  const prependingRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const activeConversationId = Number(conversation?.id) || null;
  const canSend = Boolean(conversation?.is_match) && !conversation?.blocked_by_you && !conversation?.blocked_you;
  const conversationTitle = conversation?.other_user?.username
    ? `@${conversation.other_user.username}`
    : "?";

  const loadConversation = useCallback(async () => {
    if (!currentUser?.id || !conversationId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchConversationMessages(currentUser, conversationId, { limit: PAGE_SIZE, offset: 0 });
      const nextMessages = dedupeMessages(data?.messages || []);
      setConversation(data?.conversation || null);
      setMessages(nextMessages);
      setOffset(nextMessages.length);
      setHasMore(Boolean(data?.paging?.has_more));
      if (data?.conversation?.id) {
        await markConversationAsRead(currentUser, data.conversation.id).catch(() => {});
      }
    } catch (err) {
      setError(err?.message || "Unable to load conversation");
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUser]);

  const loadOlder = useCallback(async () => {
    if (!currentUser?.id || !conversationId || !hasMore || loadingMore) return;
    const listEl = listRef.current;
    if (!listEl) return;
    setLoadingMore(true);
    prependingRef.current = { top: listEl.scrollTop, height: listEl.scrollHeight };

    try {
      const data = await fetchConversationMessages(currentUser, conversationId, { limit: PAGE_SIZE, offset });
      const older = dedupeMessages(data?.messages || []);
      if (older.length > 0) {
        setMessages((prev) => dedupeMessages([...older, ...prev]));
        setOffset((prev) => prev + older.length);
      }
      setHasMore(Boolean(data?.paging?.has_more));
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, currentUser, hasMore, loadingMore, offset]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!prependingRef.current || !listRef.current) return;
    const { top, height } = prependingRef.current;
    const nextHeight = listRef.current.scrollHeight;
    listRef.current.scrollTop = top + (nextHeight - height);
    prependingRef.current = null;
  }, [messages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prependingRef.current) return;
    const lastMsg = messages[messages.length - 1];
    const isLastMine = Number(lastMsg?.sender_user_id) === currentUserId;
    if (isNearBottom || isLastMine) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isNearBottom, currentUserId]);

  useEffect(() => {
    const id = Number(conversationId);
    if (!Number.isInteger(id) || id <= 0) return undefined;
    joinConversationRoom(id);
    return () => leaveConversationRoom(id);
  }, [conversationId]);

  useEffect(() => {
    if (!activeConversationId || !currentUserId) return undefined;
    const offCreated = onRealtimeEvent(REALTIME_EVENTS.CHAT_MESSAGE_CREATED, ({ message }) => {
      if (Number(message?.conversation_id) !== activeConversationId) return;
      setMessages((prev) => dedupeMessages([...prev, message]));
      if (Number(message?.sender_user_id) !== currentUserId) {
        void markConversationAsRead({ id: currentUserId }, activeConversationId).catch(() => {});
      }
    });

    const offDeleted = onRealtimeEvent(REALTIME_EVENTS.CHAT_MESSAGE_DELETED, (payload) => {
      if (Number(payload?.conversation_id) !== activeConversationId) return;
      const messageId = Number(payload?.message_id);
      if (!Number.isInteger(messageId)) return;
      setMessages((prev) => prev.filter((m) => Number(m.id) !== messageId));
      setQuotedMessage((prev) => (Number(prev?.id) === messageId ? null : prev));
    });

    const offConversationDeleted = onRealtimeEvent(REALTIME_EVENTS.CHAT_CONVERSATION_DELETED, (payload) => {
      if (Number(payload?.conversation_id) !== activeConversationId) return;
      navigate("/messages", { replace: true });
    });

    return () => {
      offCreated();
      offDeleted();
      offConversationDeleted();
    };
  }, [activeConversationId, currentUserId, navigate]);

  const groupedMessages = useMemo(() => {
    return messages.map((msg, index) => ({
      msg,
      showDay: index === 0 || dateKey(messages[index - 1]?.created_at) !== dateKey(msg?.created_at),
      isMine: Number(msg?.sender_user_id) === currentUserId,
    }));
  }, [messages, currentUserId]);

  const handleSend = useCallback(async (event) => {
    event.preventDefault();
    const trimmed = String(body || "").trim();
    if (!trimmed || !conversation?.other_user?.id || !currentUserId) return;
    let content = trimmed;
    if (quotedMessage?.content) {
      const quoteHeader = `Replying to message #${quotedMessage.id}:`;
      content = `${quoteHeader}\n> ${String(quotedMessage.content).replace(/\n/g, "\n> ")}\n\n${trimmed}`;
    }

    setSending(true);
    setError("");
    try {
      const payload = await sendChatMessage({ id: currentUserId }, Number(conversation.other_user.id), content);
      if (payload?.message) {
        setMessages((prev) => dedupeMessages([...prev, payload.message]));
      }
      setBody("");
      setQuotedMessage(null);
    } catch (err) {
      setError(err?.message || "Unable to send message");
    } finally {
      setSending(false);
    }
  }, [body, conversation, currentUserId, quotedMessage]);

  const handleDeleteConversation = useCallback(async () => {
    if (!activeConversationId || !currentUserId) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this chat from your inbox? This only affects your side.",
    );
    if (!confirmed) return;
    setDeletingConversation(true);
    setError("");
    try {
      await deleteChatConversation({ id: currentUserId }, activeConversationId);
      navigate("/messages", { replace: true, state: { removedConversationId: activeConversationId } });
    } catch (err) {
      setError(err?.message || "Unable to delete conversation");
    } finally {
      setDeletingConversation(false);
    }
  }, [activeConversationId, currentUserId, navigate]);

  const handleDeleteMessage = useCallback(async (message) => {
    if (!activeConversationId || !currentUserId || !message?.id) return;
    setDeletingMessageId(message.id);
    try {
      await deleteChatMessage({ id: currentUserId }, activeConversationId, message.id);
      setMessages((prev) => prev.filter((m) => Number(m.id) !== Number(message.id)));
      setQuotedMessage((prev) => (Number(prev?.id) === Number(message.id) ? null : prev));
    } finally {
      setDeletingMessageId(null);
    }
  }, [activeConversationId, currentUserId]);
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ChatAvatar name={conversation?.other_user?.username || "?"} photoUrl={conversation?.other_user?.primary_photo_url} isOnline={Boolean(conversation?.other_user?.is_online)} />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{conversationTitle}</h2>
            {canSend ? (
              <span className="ml-1 rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Matched</span>
            ) : (
              <p className="text-sm text-slate-500">Messaging unavailable</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!embedded && (
            <button type="button" onClick={() => navigate("/messages")} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
              <FiArrowLeft size={14} /> Back to inbox
            </button>
          )}
          <button type="button" onClick={handleDeleteConversation} disabled={deletingConversation || !activeConversationId} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 disabled:opacity-60">
            <FiTrash2 size={14} /> {deletingConversation ? "Deleting…" : "Delete chat"}
          </button>
        </div>
      </header>

      {error && <p className="text-sm text-amber-600">{error}</p>}

      <div ref={listRef} onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop <= 32 && hasMore && !loadingMore) void loadOlder();
      }} className="max-h-[360px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
        {loading && <p className="text-sm text-slate-500">Loading messages...</p>}
        {loadingMore && <p className="text-xs text-slate-400">Loading older messages...</p>}
        {!loading && groupedMessages.length === 0 && (
          <p className="text-sm text-slate-500">You matched. Say hi to start the conversation.</p>
        )}
        <ul className="space-y-2">
          {groupedMessages.map(({ msg, showDay, isMine }) => (
            <li key={msg.id} className="space-y-1">
              {showDay && (
                <div className="text-center text-[11px] text-slate-500">{formatDayLabel(msg.created_at)}</div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[68%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-brand text-white" : "bg-slate-100 text-slate-900"}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={`mt-1 flex items-center gap-2 text-[11px] ${isMine ? "text-white/80 justify-end" : "text-slate-500"}`}>
                    <span>{formatTime(msg.created_at)}</span>
                    <button type="button" onClick={() => setQuotedMessage(msg)} className="underline inline-flex items-center gap-1">
                      <FiCornerUpLeft size={10} /> Quote
                    </button>
                    {isMine && (
                      <button type="button" onClick={() => handleDeleteMessage(msg)} disabled={deletingMessageId === msg.id} className="underline">
                        {deletingMessageId === msg.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {canSend && (
        <form onSubmit={handleSend} className="space-y-2">
          {quotedMessage && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Replying to #{quotedMessage.id}</span>
                <button type="button" onClick={() => setQuotedMessage(null)} className="underline">Clear</button>
              </div>
              <p className="mt-1 line-clamp-2">{quotedMessage.content}</p>
            </div>
          )}
          <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} className={chatInputClass} placeholder="Write a message..." disabled={sending} maxLength={MAX_CHAT_MESSAGE_LENGTH} />
          <div className="flex justify-end">
            <button type="submit" disabled={sending || !body.trim()} className={chatButtonClass(sending || !body.trim())}>{sending ? "Sending…" : "Send"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
