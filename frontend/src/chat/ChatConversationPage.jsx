import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import ChatAvatar from "./components/ChatAvatar.jsx";
import ChatConversationMessage from "./components/ChatConversationMessage.jsx";
import ChatConversationStatusBadge from "./components/ChatConversationStatusBadge.jsx";
import {
  deleteChatConversation,
  deleteChatMessage,
  fetchConversationMessages,
  markConversationAsRead,
  sendChatMessage,
} from "./hooks/api.js";
import { useChatConversationRealtime } from "./hooks/useChatConversationRealtime.js";
import { chatButtonClass, chatInputClass } from "../styles/UIClasses.jsx";
import { dateKey, dedupeMessages} from "./utils/messageFormat.js";
import { parseQuotedMessageContent } from "./hooks/quoteUtils.js";
import { tertiaryButtonClass, deleteButtonClass } from "@/styles/UIClasses.jsx"
import { MoveLeft, Trash2 } from "lucide-react";

const PAGE_SIZE = 18;
const MAX_CHAT_MESSAGE_LENGTH = 500;

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
  const [unmatchedAt, setUnmatchedAt] = useState(null);
  const [wasMatchedBefore, setWasMatchedBefore] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState(null);
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
      const conv = data?.conversation || null;
      
      setConversation(conv);
      setMessages(nextMessages);
      
      // Check if this was previously matched (by checking for unmatch messages)
      const hasUnmatchMessage = nextMessages.some((msg) => msg.content?.includes("You are no longer matched"));
      if (hasUnmatchMessage && !conv?.is_match) {
        setWasMatchedBefore(true);
        setUnmatchedAt(new Date()); // Will be updated if we find the exact message time
      }
      
      setOffset(nextMessages.length);
      setHasMore(Boolean(data?.paging?.has_more));
      if (conv?.id) {
        await markConversationAsRead(currentUser, conv.id).catch(() => {});
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

  const groupedMessages = useMemo(() => {
    const allGrouped = messages.map((msg, index) => ({
      msg,
      showDay: index === 0 || dateKey(messages[index - 1]?.created_at) !== dateKey(msg?.created_at),
      isMine: Number(msg?.sender_user_id) === currentUserId,
      showMatchBadge: index === 0 && conversation?.is_match && conversation?.match_created_at,
    }));
    
    return allGrouped.filter((item) => 
      !item.msg.content?.includes("You are no longer matched") &&
      !item.msg.content?.includes("You matched with")
    );
  }, [messages, currentUserId, conversation?.is_match, conversation?.match_created_at]);

  const handleSend = useCallback(async (event) => {
    event.preventDefault();
    const trimmed = String(body || "").trim();
    if (!trimmed || !conversation?.other_user?.id || !currentUserId) return;
    let content = trimmed;
    if (quotedMessage?.content) {
      const parsed = parseQuotedMessageContent(quotedMessage.content);
      const actualQuoteText = parsed.replyText || quotedMessage.content;
      const quoteHeader = `Replying to message #${quotedMessage.id}:`;
      content = `${quoteHeader}\n> ${String(actualQuoteText).replace(/\n/g, "\n> ")}\n\n${trimmed}`;
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

  useChatConversationRealtime({
    conversationId,
    activeConversationId,
    currentUserId,
    otherUserId: conversation?.other_user?.id,
    loadConversation,
    navigate,
    setConversation,
    setMessages,
    setQuotedMessage,
    setWasMatchedBefore,
    setUnmatchedAt,
  });

  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => navigate(`/users/${conversation?.other_user?.id}`)}
            className="hover:opacity-75 transition-opacity"
          >
            <ChatAvatar name={conversation?.other_user?.username || "?"} photoUrl={conversation?.other_user?.primary_photo_url} isOnline={Boolean(conversation?.other_user?.is_online)} />
          </button>
          <div>
            <h2 
              className="text-2xl font-bold text-neutral-dark cursor-pointer hover:text-slate-700 transition-colors"
              onClick={() => navigate(`/users/${conversation?.other_user?.id}`)}
            >
              {conversationTitle}
            </h2>
            {conversation?.blocked_by_you ? (
              <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Blocked by you</span>
            ) : conversation?.blocked_you ? (
              <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Blocked you</span>
            ) : conversation?.is_match ? (
              <span className="ml-1 rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Matched</span>
            ) : (
              <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Unmatched</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">

  {!embedded && (
    <button
      type="button"
      onClick={() => navigate("/messages")}
      className={`${tertiaryButtonClass} h-8 px-2 text-xs sm:text-sm`}
    >
      <MoveLeft size={14} />
      {/* mobile */}
      <span className="sm:hidden ml-1">Back</span>

      {/* desktop */}
      <span className="hidden sm:inline ml-1">Back to inbox</span>
    </button>
  )}

  <button
    type="button"
    onClick={handleDeleteConversation}
    disabled={deletingConversation || !activeConversationId}
    className={`${deleteButtonClass} h-8 px-2 text-xs sm:text-sm`}
  >
    <Trash2 size={14} />

    {/* mobile */}
    <span className="sm:hidden ml-1">
      {deletingConversation ? "..." : "Delete"}
    </span>

    {/* desktop */}
    <span className="hidden sm:inline ml-1">
      {deletingConversation ? "Deleting…" : "Delete chat"}
    </span>
  </button>

</div>
      </header>

      {error && <p className="text-sm text-primary-dark">{error}</p>}

      <div ref={listRef} onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop <= 32 && hasMore && !loadingMore) void loadOlder();
      }} className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
        {loading && <p className="text-sm text-slate-500">Loading messages...</p>}
        {loadingMore && <p className="text-xs text-slate-400">Loading older messages...</p>}
        {!loading && groupedMessages.length === 0 && (
          <p className="text-sm text-slate-500">You matched. Say hi to start the conversation.</p>
        )}
        <ul className="space-y-2">
          {groupedMessages.map(({ msg, showDay, isMine }) => (
            <ChatConversationMessage
              key={`msg-${msg.id}`}
              msg={msg}
              showDay={showDay}
              isMine={isMine}
              conversation={conversation}
              currentUserId={currentUserId}
              expandedMessageId={expandedMessageId}
              setExpandedMessageId={setExpandedMessageId}
              deletingMessageId={deletingMessageId}
              onQuote={setQuotedMessage}
              onDelete={handleDeleteMessage}
            />
          ))}
          <ChatConversationStatusBadge
            conversation={conversation}
            groupedMessages={groupedMessages}
            messages={messages}
            wasMatchedBefore={wasMatchedBefore}
            unmatchedAt={unmatchedAt}
          />
        </ul>
      </div>

      {canSend && (
        <form onSubmit={handleSend} className="space-y-2">
          {quotedMessage && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-l-4 border-primary-dark bg-primary-light p-2.5 text-xs text-slate-600 shadow-sm">
              <div className="flex-1 overflow-hidden pr-2">
                <span className="block font-semibold text-primary-dark mb-0.5">Replying to:</span>
                <p className="truncate opacity-80 break-all">{parseQuotedMessageContent(quotedMessage.content).replyText || quotedMessage.content}</p>
              </div>
              <button type="button" onClick={() => setQuotedMessage(null)} className="text-primary-dark hover:text-primary-light p-1 rounded-full hover:bg-primary transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          )}
          <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} className={chatInputClass} placeholder="Write a message..." disabled={sending} maxLength={MAX_CHAT_MESSAGE_LENGTH} />
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs font-medium ${body.length >= MAX_CHAT_MESSAGE_LENGTH ? "text-red-500" : "text-slate-400"}`}>
              {body.length}/{MAX_CHAT_MESSAGE_LENGTH}
            </span>
            <button type="submit" disabled={sending || !body.trim() || body.length > MAX_CHAT_MESSAGE_LENGTH} className={chatButtonClass(sending || !body.trim() || body.length > MAX_CHAT_MESSAGE_LENGTH)}>{sending ? "Sending…" : "Send"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
