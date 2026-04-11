import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FiCheck } from "react-icons/fi";
import ChatAvatar from "../chat/ChatAvatar.jsx";
import {
  joinConversationRoom,
  leaveConversationRoom,
  onRealtimeEvent,
} from "../realtime/socket.js";
import { buildApiHeaders } from "../utils.js";
import {
  fetchConversationMessages,
  markConversationAsRead,
  sendChatMessage,
} from "../chat/api.js";

const PAGE_SIZE = 20;

const chatBubbleClass =
  "rounded-2xl border border-slate-200 px-3 py-1 text-sm leading-tight shadow-sm";
const chatInputClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition min-h-[72px]";
const chatButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-4 py-3 text-base font-semibold text-white shadow-lg shadow-orange-200/60 hover:-translate-y-0.5 transition";

function MessageStatus({ isRead, className = "" }) {
  if (isRead) {
    return (
      <span className={`inline-flex items-center text-[0.65rem] font-semibold text-sky-500 ${className}`} aria-label="Read">
        <FiCheck size={11} className="-mr-1" />
        <FiCheck size={11} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center text-[0.65rem] font-semibold text-slate-400 ${className}`} aria-label="Sent">
      <FiCheck size={11} />
    </span>
  );
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    year: sameYear ? undefined : "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMessageDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDaySeparator(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const todayKey = getMessageDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getMessageDateKey(yesterday);
  const messageKey = getMessageDateKey(date);

  if (messageKey === todayKey) return "Today";
  if (messageKey === yesterdayKey) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function areMessagesInSameGroup(left, right) {
  if (!left || !right) return false;
  if (Number(left.sender_user_id) !== Number(right.sender_user_id)) return false;

  const leftTime = new Date(left.created_at).getTime();
  const rightTime = new Date(right.created_at).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return false;

  // Group close messages from same sender into one visual block.
  return Math.abs(rightTime - leftTime) <= 5 * 60 * 1000;
}

function dedupeMessages(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const id = item?.id != null ? String(item.id) : null;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    deduped.push(item);
  }
  return deduped;
}


export default function ChatConversationPage({ currentUser, embedded = false }) {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const listRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);
  const lastReadMarkerRef = useRef("");
  const [openedTimestampId, setOpenedTimestampId] = useState(null);
  const prependingScrollRef = useRef(null);

  const markCurrentConversationAsRead = useCallback(async () => {
    if (!currentUser?.id || !conversationId) return;
    try {
      await markConversationAsRead(currentUser, conversationId);
    } catch {
      // Keep chat usable even if read-status sync fails briefly.
    }
  }, [currentUser, conversationId]);

  const loadConversation = useCallback(async () => {
    if (!currentUser?.id || !conversationId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchConversationMessages(currentUser, conversationId, {
        limit: PAGE_SIZE,
        offset: 0,
      });
      setMessages(
        Array.isArray(data.messages)
          ? dedupeMessages(data.messages)
          : [],
      );
      setConversation(data.conversation || null);
      setMessagesOffset(Array.isArray(data.messages) ? data.messages.length : 0);
      setHasMoreMessages(Boolean(data?.paging?.has_more));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, conversationId]);

  const loadOlderMessages = useCallback(async () => {
    if (!currentUser?.id || !conversationId || isLoadingMore || !hasMoreMessages) {
      return;
    }

    const listEl = listRef.current;
    if (!listEl) return;

    setIsLoadingMore(true);
    prependingScrollRef.current = {
      top: listEl.scrollTop,
      height: listEl.scrollHeight,
    };

    try {
      const data = await fetchConversationMessages(currentUser, conversationId, {
        limit: PAGE_SIZE,
        offset: messagesOffset,
      });

      const older = Array.isArray(data.messages)
        ? dedupeMessages(data.messages)
        : [];

      if (older.length > 0) {
        setMessages((prev) => dedupeMessages([...older, ...prev]));
        setMessagesOffset((prev) => prev + older.length);
      }

      setHasMoreMessages(Boolean(data?.paging?.has_more));
    } catch {
      // Keep chat usable even if loading older messages fails.
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    conversationId,
    currentUser,
    hasMoreMessages,
    isLoadingMore,
    messagesOffset,
  ]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    const numericConversationId = Number(conversationId);
    if (!Number.isInteger(numericConversationId) || numericConversationId <= 0) {
      return undefined;
    }

    joinConversationRoom(numericConversationId);

    return () => {
      leaveConversationRoom(numericConversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!currentUser?.id || !conversation?.other_user?.id) return undefined;

    let cancelled = false;

    async function loadOtherUserPhoto() {
      try {
        const response = await fetch(`/api/profile/${conversation.other_user.id}`, {
          headers: buildApiHeaders(currentUser),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        const photos = Array.isArray(payload?.profile?.photos)
          ? payload.profile.photos
          : [];
        const primaryPhoto =
          photos.find((photo) => photo?.is_primary)?.data_url ||
          photos[0]?.data_url ||
          "";

        if (!primaryPhoto) return;

        setConversation((prev) => {
          if (!prev?.other_user || Number(prev.other_user.id) !== Number(conversation.other_user.id)) {
            return prev;
          }

          if (prev.other_user.primary_photo_url === primaryPhoto) {
            return prev;
          }

          return {
            ...prev,
            other_user: {
              ...prev.other_user,
              primary_photo_url: primaryPhoto,
            },
          };
        });
      } catch {
        // Keep the chat usable if the profile image lookup fails.
      }
    }

    loadOtherUserPhoto();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, conversation?.other_user?.id]);

  useEffect(() => {
    markCurrentConversationAsRead();
  }, [markCurrentConversationAsRead]);

  useEffect(() => {
    seenMessageIdsRef.current = new Set();
    initialLoadRef.current = true;
    setHasMoreMessages(false);
    setMessagesOffset(0);
    prependingScrollRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!messages?.length || !currentUser?.id) return;
    const seen = seenMessageIdsRef.current;
    let shouldPlay = false;

    for (const msg of messages) {
      const identifier = msg?.id != null ? String(msg.id) : null;
      if (!identifier) continue;
      if (seen.has(identifier)) continue;
      seen.add(identifier);
      if (
        !initialLoadRef.current &&
        Number(msg.sender_user_id) !== Number(currentUser.id)
      ) {
        shouldPlay = true;
      }
    }

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // No sound on new message
  }, [messages, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !conversation?.id || !messages?.length) return;

    const hasUnreadIncomingMessage = messages.some(
      (msg) => Number(msg?.sender_user_id) !== Number(currentUser.id),
    );

    if (!hasUnreadIncomingMessage) return;

    const latestMessage = messages[messages.length - 1];
    const latestMarker = `${conversation.id}:${latestMessage?.id ?? latestMessage?.created_at ?? ""}`;
    if (!latestMarker || lastReadMarkerRef.current === latestMarker) {
      return;
    }

    lastReadMarkerRef.current = latestMarker;
    void markCurrentConversationAsRead();
  }, [currentUser?.id, conversation?.id, messages, markCurrentConversationAsRead]);

  useEffect(() => {
    if (!currentUser?.id || !conversation?.id) {
      return undefined;
    }

    const off = onRealtimeEvent("chat:message:created", (payload) => {
        const message = payload?.message;
        if (
          !message ||
          Number(message.conversation_id) !== Number(conversation.id)
        ) {
          return;
        }

        setMessages((prev) => dedupeMessages([...prev, message]));
        if (Number(message.sender_user_id) !== Number(currentUser.id)) {
          void markCurrentConversationAsRead();
        }
      });

    const offReadUpdate = onRealtimeEvent(
      "chat:conversation:read",
      (payload) => {
        if (Number(payload?.conversation_id) !== Number(conversation.id)) {
          return;
        }

        const readerUserId = Number(payload?.reader_user_id);
        if (!Number.isInteger(readerUserId)) return;

        setMessages((prev) =>
          prev.map((msg) => {
            if (Number(msg.conversation_id) !== Number(conversation.id)) {
              return msg;
            }

            if (Number(msg.sender_user_id) !== Number(currentUser.id)) {
              return msg;
            }

            if (Number(msg.recipient_user_id) !== readerUserId) {
              return msg;
            }

            return {
              ...msg,
              is_read: true,
            };
          }),
        );

        // A read event can arrive before the sender has inserted the new message
        // into local state; re-sync to avoid stale single-check UI.
        if (readerUserId !== Number(currentUser.id)) {
          void loadConversation();
        }
      },
    );

    return () => {
      off();
      offReadUpdate();
    };
  }, [currentUser?.id, conversation?.id, loadConversation, markCurrentConversationAsRead]);

  useEffect(() => {
    if (!currentUser?.id || !conversationId) return undefined;

    const offConnect = onRealtimeEvent("connect", () => {
      void loadConversation();
      void markCurrentConversationAsRead();
    });

    return () => {
      offConnect();
    };
  }, [currentUser?.id, conversationId, loadConversation, markCurrentConversationAsRead]);

  useEffect(() => {
    if (!conversation?.other_user?.id) return undefined;

    const otherUserId = Number(conversation.other_user.id);
    if (!Number.isInteger(otherUserId)) return undefined;

    const offPresenceUpdate = onRealtimeEvent("presence:update", (payload) => {
      if (Number(payload?.user_id) !== otherUserId) return;

      setConversation((prev) => {
        if (!prev?.other_user) return prev;

        return {
          ...prev,
          other_user: {
            ...prev.other_user,
            is_online: Boolean(payload.is_online),
            last_seen_at: payload.last_seen_at || prev.other_user.last_seen_at,
          },
        };
      });
    });

    return () => {
      offPresenceUpdate();
    };
  }, [conversation?.other_user?.id]);

  useEffect(() => {
    if (!listRef.current) return;

    if (prependingScrollRef.current) {
      const previous = prependingScrollRef.current;
      const delta = listRef.current.scrollHeight - previous.height;
      listRef.current.scrollTop = previous.top + delta;
      prependingScrollRef.current = null;
      return;
    }

    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const handleMessagesScroll = useCallback(() => {
    if (!listRef.current || isLoadingMore || !hasMoreMessages) return;
    if (listRef.current.scrollTop <= 24) {
      void loadOlderMessages();
    }
  }, [hasMoreMessages, isLoadingMore, loadOlderMessages]);

  useEffect(() => {
    return () => {
      void markCurrentConversationAsRead();
    };
  }, [markCurrentConversationAsRead]);

  const handleSend = useCallback(
    async (event) => {
      event.preventDefault();
      if (!currentUser?.id || !conversation?.other_user?.id) {
        return;
      }

      const sanitized = body.trim();
      if (!sanitized) return;

      setIsSending(true);
      setError("");
      try {
        const payload = await sendChatMessage(
          currentUser,
          conversation.other_user.id,
          sanitized,
        );
        setBody("");
        setConversation((prev) => ({
          ...prev,
          id: payload.conversation_id,
        }));
        setMessages((prev) => dedupeMessages([...prev, payload.message]));
      } catch (err) {
        setError(err.message);
      } finally {
        setIsSending(false);
      }
    },
    [body, conversation, currentUser],
  );

  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }

  const displayName =
    conversation?.other_user?.first_name ||
    conversation?.other_user?.username ||
    "Conversation";
  const otherUserPhotoUrl =
    conversation?.other_user?.primary_photo_url ||
    conversation?.other_user?.photo_url ||
    conversation?.other_user?.profile_photo_url ||
    "";
  const currentUserId = Number(currentUser.id);

  return (
    <section className={embedded ? "w-full space-y-5" : "mx-auto max-w-xl w-full space-y-5 px-3 sm:px-4"}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (conversation?.other_user?.id) {
                navigate(`/users/${conversation.other_user.id}`);
              }
            }}
            className="focus:outline-none"
            title="View profile"
          >
            <ChatAvatar
              name={displayName}
              photoUrl={otherUserPhotoUrl}
              isOnline={Boolean(conversation?.other_user?.is_online)}
              sizeClass="h-14 w-14"
              imageClassName="rounded-2xl"
            />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{displayName}</h2>
            <p className="text-sm text-slate-500">
              {conversation?.other_user?.is_online ? "Currently online" : "Offline"}
            </p>
          </div>
        </div>
        {!embedded && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                navigate("/messages", {
                  state: { markAsReadConversationId: conversation?.id },
                })
              }
              className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700"
            >
              Back to inbox
            </button>
          </div>
        )}
      </header>

      {error && (
        <p className="text-sm text-amber-600">{error}</p>
      )}

      <div
        ref={listRef}
        onScroll={handleMessagesScroll}
        className="flex max-h-[320px] w-full flex-col gap-1 overflow-y-auto rounded-3xl border-2 border-slate-200 bg-white/90 px-3 py-3 shadow-sm"
      >
        {isLoadingMore && (
          <p className="text-xs text-slate-400">Loading older messages...</p>
        )}
        {loading && <p className="text-sm text-slate-500">Loading messages...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Start the dialog by sending your first message.
          </p>
        )}
        <ul className="space-y-1">
          {messages.map((msg, index) => {
            const isMine = Number(msg.sender_user_id) === currentUserId;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
            const startsNewDay =
              !prevMsg ||
              getMessageDateKey(prevMsg.created_at) !== getMessageDateKey(msg.created_at);
            const isLastInGroup = !nextMsg || !areMessagesInSameGroup(msg, nextMsg);
            const messageId = msg.id != null ? String(msg.id) : `idx-${index}`;
            const showTimestamp = isLastInGroup || openedTimestampId === messageId;

            return (
              <li
                key={
                  msg.id != null
                    ? `msg-${msg.id}`
                    : `msg-${index}-${msg.created_at ?? ""}`
                }
                className="space-y-1"
              >
                {startsNewDay && (
                  <div className="py-1 text-center">
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
                      {formatDaySeparator(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`group flex max-w-[62%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                    <button
                      type="button"
                      onClick={() => setOpenedTimestampId(messageId)}
                      className={`${chatBubbleClass} text-left ${
                        isMine
                          ? "from-brand to-brand-deep bg-gradient-to-r border-transparent text-white shadow-lg"
                          : "border-slate-200 bg-slate-100 text-slate-900"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-normal break-normal">{msg.content}</p>
                    </button>
                    {isMine ? (
                      <div
                        className={`inline-flex items-center gap-1 overflow-hidden text-[0.65rem] text-slate-500 transition-all ${
                          showTimestamp
                            ? "mt-0.5 max-h-6 opacity-100"
                            : "max-h-0 opacity-0 group-hover:mt-0.5 group-hover:max-h-6 group-hover:opacity-100 group-focus-within:mt-0.5 group-focus-within:max-h-6 group-focus-within:opacity-100"
                        }`}
                      >
                        <span>{formatTime(msg.created_at)}</span>
                        <MessageStatus isRead={Boolean(msg.is_read)} />
                      </div>
                    ) : (
                      <p
                        className={`overflow-hidden text-[0.65rem] text-slate-500 transition-all ${
                          showTimestamp
                            ? "mt-0.5 max-h-6 opacity-100"
                            : "max-h-0 opacity-0 group-hover:mt-0.5 group-hover:max-h-6 group-hover:opacity-100 group-focus-within:mt-0.5 group-focus-within:max-h-6 group-focus-within:opacity-100"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <form onSubmit={handleSend} className="space-y-2">
        <textarea
          rows={2}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className={chatInputClass}
          placeholder="Write a message..."
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className={chatButtonClass}
            disabled={isSending || !body.trim()}
          >
            {isSending ? "Sending…" : "Send message"}
          </button>
        </div>
      </form>
    </section>
  );
}
