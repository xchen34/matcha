import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FiCheck, FiCornerUpLeft, FiTrash2 } from "react-icons/fi";
import ChatAvatar from "../chat/ChatAvatar.jsx";
import {
  joinConversationRoom,
  leaveConversationRoom,
  onRealtimeEvent,
} from "../realtime/socket.js";
import { REALTIME_EVENTS } from "../realtime/events.js";
import { buildApiHeaders } from "../utils.js";
import { sanitizeText } from "../utils/xssEscape.js";
import { parseQuotedMessageContent } from "../chat/quoteUtils.js";
import {
  deleteChatConversation,
  deleteChatMessage,
  fetchConversationMessages,
  markConversationAsRead,
  sendChatMessage,
} from "../chat/api.js";

const PAGE_SIZE = 20;
const MAX_CHAT_MESSAGE_LENGTH = 1200;

const chatBubbleClass =
  "rounded-2xl border border-slate-200 px-3 py-1 text-sm leading-tight shadow-sm cursor-default";
const chatInputClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition min-h-[72px]";
const chatButtonClass = (isDisabled) =>
  isDisabled
    ? "inline-flex items-center justify-center rounded-full bg-slate-300 px-4 py-3 text-base font-semibold text-white shadow-lg opacity-60 cursor-not-allowed"
    : "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-4 py-3 text-base font-semibold text-white shadow-lg shadow-orange-200/60 hover:-translate-y-0.5 transition";

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

function getMessageAuthorLabel(message, currentUser, conversation) {
  if (!message) return "Someone";
  if (Number(message.sender_user_id) === Number(currentUser?.id)) {
    return "You";
  }

  return (
    conversation?.other_user?.first_name ||
    conversation?.other_user?.username ||
    `User ${message.sender_user_id}`
  );
}

function normalizeQuoteLine(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLatestQuoteText(rawContent) {
  let candidate = String(rawContent || "").trim();
  let lastMeaningful = normalizeQuoteLine(candidate);

  for (let depth = 0; depth < 5; depth += 1) {
    const parsed = parseQuotedMessageContent(candidate);
    if (!parsed.quoteHeader) {
      break;
    }

    if (parsed.replyText) {
      const reply = normalizeQuoteLine(parsed.replyText);
      if (reply) {
        lastMeaningful = reply;
        break;
      }
    }

    const nestedQuote = parsed.quoteLines.join("\n").trim();
    if (!nestedQuote) {
      break;
    }
    candidate = nestedQuote;
    const normalizedNested = normalizeQuoteLine(nestedQuote);
    if (normalizedNested) {
      lastMeaningful = normalizedNested;
    }
  }

  return lastMeaningful;
}

function buildQuoteText(message, currentUser, conversation) {
  const author = getMessageAuthorLabel(message, currentUser, conversation);
  const latestQuote = extractLatestQuoteText(message?.content || "");
  const lines = String(latestQuote || "")
    .split("\n")
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => `> ${line}`)
    .join("\n");

  return `${author} wrote:\n${lines}`.trim();
}

function buildQuotePreviewText(message, currentUser, conversation) {
  const author = getMessageAuthorLabel(message, currentUser, conversation);
  const parsed = parseQuotedMessageContent(message?.content);
  const sourceText = parsed.replyText || parsed.quoteLines.join(" ") || message?.content || "";
  const previewText = String(sourceText)
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  if (!previewText) {
    return `Replying to ${author}`;
  }

  const shortened = previewText.length > 96 ? `${previewText.slice(0, 96).trimEnd()}…` : previewText;
  return `${author}: ${shortened}`;
}

function isQuotedMessageContent(content) {
  return Boolean(parseQuotedMessageContent(content).quoteHeader);
}

function MessageBody({ content, isMine }) {
  const parsed = parseQuotedMessageContent(content);
  const [isQuoteExpanded, setIsQuoteExpanded] = useState(false);

  if (!parsed.quoteHeader) {
    return (
      <p className="text-sm leading-relaxed whitespace-normal break-normal">
        {sanitizeText(content)}
      </p>
    );
  }

  return (
    <div className={`space-y-1.5 w-full ${isMine ? 'flex flex-col items-end' : ''}`}>
      <div
        className={`max-w-full overflow-hidden rounded-xl border-l-4 px-2.5 py-1.5 text-[0.78rem] leading-snug shadow-sm ${
          isMine
            ? "border-orange-200 border-l-brand bg-orange-50 text-slate-700"
            : "border-slate-200 border-l-brand/60 bg-slate-50 text-slate-600"
        }`}
        style={isMine ? { alignSelf: 'flex-end' } : {}}
      >
        {(() => {
          const fullQuoteText = extractLatestQuoteText(parsed.quoteLines.join("\n"));
          const trimmedQuoteText = String(fullQuoteText || "").trim();
          const shouldCollapse = trimmedQuoteText.length > 140;
          const displayedQuoteText =
            shouldCollapse && !isQuoteExpanded
              ? `${trimmedQuoteText.slice(0, 140).trimEnd()}...`
              : trimmedQuoteText;
          return (
            <div className="space-y-1">
              <p className="font-medium leading-tight break-words">
                {sanitizeText(parsed.quoteHeader)}: {sanitizeText(displayedQuoteText)}
              </p>
              {shouldCollapse && (
                <button
                  type="button"
                  onClick={() => setIsQuoteExpanded((prev) => !prev)}
                  className="text-[0.68rem] font-semibold text-brand-deep hover:underline"
                >
                  {isQuoteExpanded ? "Show less" : "Show full"}
                </button>
              )}
            </div>
          );
        })()}
      </div>
      {parsed.replyText && (
        <p
          className={`inline-block max-w-full rounded-2xl px-3 py-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isMine
              ? "bg-brand text-white shadow-sm ml-auto text-right"
              : "border border-slate-200 bg-white text-slate-900 shadow-sm"
          }`}
        >
          {sanitizeText(parsed.replyText)}
        </p>
      )}
    </div>
  );
}


export default function ChatConversationPage({ currentUser, embedded = false }) {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const currentUserId = Number(currentUser?.id) || null;
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const activeConversationId = Number(conversation?.id) || null;
  const [isMatch, setIsMatch] = useState(true);
  const [matchError, setMatchError] = useState("");
  const [blockStatus, setBlockStatus] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [quotedMessage, setQuotedMessage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isDeletingMessageId, setIsDeletingMessageId] = useState(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const listRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);
  const lastReadMarkerRef = useRef("");
  const [, setOpenedTimestampId] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const prependingScrollRef = useRef(null);

  useEffect(() => {
    if (!selectedMessageId) return undefined;

    function handlePointerDown(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        setSelectedMessageId(null);
        return;
      }

      const bubbleButton = target.closest('[data-message-id] button');
      if (bubbleButton && bubbleButton.closest('[data-message-id]')?.getAttribute('data-message-id') === String(selectedMessageId)) {
        return;
      }

      setSelectedMessageId(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [selectedMessageId]);

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
      const blockedByYou = Boolean(data.conversation?.blocked_by_you);
      const blockedYou = Boolean(data.conversation?.blocked_you);
      const matched =
        data.conversation && typeof data.conversation.is_match !== "undefined"
          ? Boolean(data.conversation.is_match)
          : true;

      if (blockedByYou) {
        setBlockStatus("blocked_by_you");
        setIsMatch(false);
        setMatchError("Cannot interact with a user you blocked.");
      } else if (blockedYou) {
        setBlockStatus("blocked_you");
        setIsMatch(false);
        setMatchError("你已被对方拉黑");
      } else if (!matched) {
        setBlockStatus("unmatched");
        setIsMatch(false);
        setMatchError(
          "Le match a été annulé. Vous ne pouvez plus envoyer de messages à cet utilisateur.",
        );
      } else {
        setBlockStatus(null);
        setIsMatch(true);
        setMatchError("");
      }
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
    setQuotedMessage(null);
    setSelectedMessageId(null);
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

    const offMessage = onRealtimeEvent("chat:message:created", (payload) => {
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

    const offMessageDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_MESSAGE_DELETED,
      (payload) => {
        if (Number(payload?.conversation_id) !== Number(conversation.id)) {
          return;
        }

        const deletedMessageId = Number(payload?.message_id);
        if (!Number.isInteger(deletedMessageId)) return;

        setMessages((prev) =>
          prev.filter((msg) => Number(msg.id) !== deletedMessageId),
        );
        setMessagesOffset((prev) => Math.max(0, prev - 1));
        setQuotedMessage((prev) =>
          Number(prev?.id) === deletedMessageId ? null : prev,
        );
        setOpenedTimestampId((prev) =>
          Number(prev) === deletedMessageId ? null : prev,
        );
        setSelectedMessageId((prev) =>
          Number(prev) === deletedMessageId ? null : prev,
        );
      },
    );

    const offConversationDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_CONVERSATION_DELETED,
      (payload) => {
        if (Number(payload?.conversation_id) !== Number(conversation.id)) {
          return;
        }

        navigate("/messages", { replace: true });
      },
    );

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

    const offMatchStatus = onRealtimeEvent("match:status:changed", (payload) => {
      if (!payload) return;
      const otherUserId = conversation?.other_user?.id;
      // On ne fait la logique que si la conversation affichée correspond à l'utilisateur concerné
      if (!otherUserId) return;
      if (Number(payload.userId) === Number(otherUserId)) {
        // Si le match est rompu, on affiche un message et on désactive l'envoi
        if (payload.matched === false) {
          setIsMatch(false);
          setMatchError("Le match a été annulé. Vous ne pouvez plus envoyer de messages à cet utilisateur.");
            setBlockStatus("unmatched");
        } else {
          setIsMatch(true);
          setBlockStatus(null);
          setMatchError("");
        }
        void loadConversation();
      }
    });

    const offBlockStatusChanged = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
      (payload) => {
        if (!conversation?.other_user?.id || !currentUser?.id) return;
        const userA = Number(payload?.user_a_id);
        const userB = Number(payload?.user_b_id);
        const me = Number(currentUser.id);
        const other = Number(conversation.other_user.id);
        if (!Number.isInteger(userA) || !Number.isInteger(userB)) return;

        const related =
          (userA === me && userB === other) ||
          (userA === other && userB === me);
        if (!related) return;

        void loadConversation();
      },
    );

    return () => {
      offMessage();
      offMessageDeleted();
      offConversationDeleted();
      offReadUpdate();
      offMatchStatus();
      offBlockStatusChanged();
    };
  }, [currentUser?.id, conversation?.id, loadConversation, markCurrentConversationAsRead, navigate]);

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

      const quoteText = quotedMessage
        ? buildQuoteText(quotedMessage, currentUser, conversation)
        : "";
      const composedContent = [quoteText, body.trim()].filter(Boolean).join("\n\n").trim();
      if (!composedContent) return;

      setIsSending(true);
      setError("");
      try {
        const payload = await sendChatMessage(
          currentUser,
          conversation.other_user.id,
          composedContent,
        );
        setBody("");
        setQuotedMessage(null);
        setConversation((prev) => ({
          ...prev,
          id: payload.conversation_id,
        }));
        setMessages((prev) => dedupeMessages([...prev, payload.message]));
      } catch (err) {
        setError(err.message);
        if (err?.message === "你已被对方拉黑") {
          setBlockStatus("blocked_you");
          setIsMatch(false);
          setMatchError("你已被对方拉黑");
        } else if (err?.message === "Cannot interact with a user you blocked.") {
          setBlockStatus("blocked_by_you");
          setIsMatch(false);
          setMatchError("Cannot interact with a user you blocked.");
        }
      } finally {
        setIsSending(false);
      }
    },
    [body, conversation, currentUser, quotedMessage],
  );

  const handleQuoteMessage = useCallback(
    (message) => {
      if (!message) return;
      setQuotedMessage(message);
      setError("");
    },
    [],
  );

  const handleOpenMessageActions = useCallback((messageId) => {
    setSelectedMessageId(String(messageId));
  }, []);

  const handleDeleteMessage = useCallback(
    async (message) => {
      if (!currentUserId || !activeConversationId || !message?.id) return;

      const confirmed = window.confirm("Delete this message?");
      if (!confirmed) return;

      setIsDeletingMessageId(message.id);
      setError("");
      try {
        await deleteChatMessage({ id: currentUserId }, activeConversationId, message.id);
        setMessages((prev) => prev.filter((item) => Number(item.id) !== Number(message.id)));
        setMessagesOffset((prev) => Math.max(0, prev - 1));
        setQuotedMessage((prev) => (Number(prev?.id) === Number(message.id) ? null : prev));
        setOpenedTimestampId((prev) => (Number(prev) === Number(message.id) ? null : prev));
        setSelectedMessageId((prev) => (Number(prev) === Number(message.id) ? null : prev));
      } catch (err) {
        setError(err.message);
      } finally {
        setIsDeletingMessageId(null);
      }
    },
    [activeConversationId, currentUserId],
  );

  const handleDeleteConversation = useCallback(async () => {
    if (!currentUserId || !activeConversationId) return;

    const confirmed = window.confirm(
      "Delete this chat from your inbox only?",
    );
    if (!confirmed) return;

    setIsDeletingConversation(true);
    setError("");
    try {
      await deleteChatConversation({ id: currentUserId }, activeConversationId);
      navigate("/messages", {
        replace: true,
        state: { removedConversationId: activeConversationId },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeletingConversation(false);
    }
  }, [activeConversationId, currentUserId, navigate]);

  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }

  const displayName = sanitizeText(
    conversation?.other_user?.first_name ||
    conversation?.other_user?.username ||
    "Conversation"
  );
  const otherUserPhotoUrl =
    conversation?.other_user?.primary_photo_url ||
    conversation?.other_user?.photo_url ||
    conversation?.other_user?.profile_photo_url ||
    "";
  const composedMessageLength = body.trim().length;

  const canSendMessages =
    isMatch && blockStatus !== "blocked_by_you" && blockStatus !== "blocked_you";

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
            <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              {displayName}
              {blockStatus === "unmatched" && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold border border-yellow-300">Unmatched</span>
              )}
              {blockStatus === "blocked_by_you" && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold border border-red-300">Blocked</span>
              )}
              {blockStatus === "blocked_you" && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold border border-red-300">Blocked you</span>
              )}
              {blockStatus === null && isMatch && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold border border-green-300">Matched</span>
              )}
            </h2>
            <p className="text-sm text-slate-500">
              {conversation?.other_user?.is_online ? "Currently online" : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!embedded && (
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
          )}
          <button
            type="button"
            onClick={handleDeleteConversation}
            disabled={isDeletingConversation}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiTrash2 size={14} aria-hidden="true" />
            <span>{isDeletingConversation ? "Deleting…" : "Delete chat"}</span>
          </button>
        </div>
      </header>

      {matchError && (
        <div className="mt-2">
          <p className="text-sm text-red-600 font-semibold">{matchError}</p>
        </div>
      )}

      {error && (
        <div className="mt-2">
          <p className="text-sm text-amber-600">{error}</p>
        </div>
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
        <ul className="space-y-2">
          {(() => {
            let lastMatchedIdx = -1;
            let lastUnmatchedIdx = -1;
            let matchedDate = null;
            let unmatchedDate = null;
            const unmatchedRegex = /unmatched|no longer matched/i;
            const matchedRegex = /matched with/i;
            messages.forEach((msg, idx) => {
              if (matchedRegex.test(msg.content)) {
                if (lastMatchedIdx === -1 || new Date(msg.created_at) > new Date(messages[lastMatchedIdx]?.created_at)) {
                  lastMatchedIdx = idx;
                  const dateMatch = msg.content.match(/on (.+)$/i);
                  matchedDate = dateMatch ? dateMatch[1] : null;
                }
              }
              if (unmatchedRegex.test(msg.content)) {
                if (lastUnmatchedIdx === -1 || new Date(msg.created_at) > new Date(messages[lastUnmatchedIdx]?.created_at)) {
                  lastUnmatchedIdx = idx;
                  const dateMatch = msg.content.match(/on (.+)$/i);
                  unmatchedDate = dateMatch ? dateMatch[1] : null;
                }
              }
            });

            // Choisir le plus récent des deux événements
            let showType = null;
            let showIdx = -1;
            let showDate = null;
            if (lastMatchedIdx !== -1 && lastUnmatchedIdx !== -1) {
              const matchedTime = new Date(messages[lastMatchedIdx].created_at).getTime();
              const unmatchedTime = new Date(messages[lastUnmatchedIdx].created_at).getTime();
              if (unmatchedTime > matchedTime) {
                showType = 'unmatched';
                showIdx = lastUnmatchedIdx;
                showDate = unmatchedDate;
              } else {
                showType = 'matched';
                showIdx = lastMatchedIdx;
                showDate = matchedDate;
              }
            } else if (lastMatchedIdx !== -1) {
              showType = 'matched';
              showIdx = lastMatchedIdx;
              showDate = matchedDate;
            } else if (lastUnmatchedIdx !== -1) {
              showType = 'unmatched';
              showIdx = lastUnmatchedIdx;
              showDate = unmatchedDate;
            }

            if (!isMatch && blockStatus === 'unmatched') {
              let lastDate = null;
              if (lastMatchedIdx !== -1) {
                lastDate = messages[lastMatchedIdx]?.created_at;
              } else if (messages.length > 0) {
                lastDate = messages[messages.length - 1]?.created_at;
              } else {
                lastDate = new Date();
              }
              const dateObj = new Date(lastDate);
              const dateStr = !Number.isNaN(dateObj.getTime())
                ? `${dateObj.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })} at ${dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                : '';
              const filteredMessages = messages.map((msg, index) => {
                if (matchedRegex.test(msg.content) || unmatchedRegex.test(msg.content)) {
                  return null;
                }
                const isMine = Number(msg.sender_user_id) === currentUserId;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                const startsNewDay =
                  !prevMsg ||
                  getMessageDateKey(prevMsg.created_at) !== getMessageDateKey(msg.created_at);
                const hasQuotedContent = isQuotedMessageContent(msg.content);
                const messageId = msg.id != null ? String(msg.id) : `idx-${index}`;
                return (
                  <li
                    key={
                      msg.id != null
                        ? `msg-${msg.id}`
                        : `msg-${index}-${msg.created_at ?? ""}`
                    }
                    data-message-id={messageId}
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
                      <div className={`group relative flex max-w-[62%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenedTimestampId(messageId);
                            handleOpenMessageActions(messageId);
                          }}
                          className={
                            `${chatBubbleClass} cursor-pointer text-left ` +
                            (isMine
                              ? "from-brand to-brand-deep bg-gradient-to-r border-transparent text-white shadow-lg"
                              : "border-slate-200 bg-slate-100 text-slate-900"
                            )
                          }
                        >
                          <MessageBody content={msg.content} isMine={isMine} />
                        </button>
                        <div
                          className={`absolute top-full z-10 mt-2 flex gap-2 text-[0.65rem] text-slate-500 transition-all duration-150 ${selectedMessageId === messageId ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} ${isMine ? "right-0 justify-end" : "left-0 justify-start"}`}
                        >
                          <button
                            type="button"
                            data-message-action
                            onClick={() => handleQuoteMessage(msg)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold hover:border-slate-300 hover:text-slate-700"
                          >
                            <FiCornerUpLeft size={10} aria-hidden="true" />
                            <span>Quote</span>
                          </button>
                          {isMine && (
                            <button
                              type="button"
                              data-message-action
                              onClick={() => handleDeleteMessage(msg)}
                              disabled={isDeletingMessageId === msg.id}
                              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2 py-0.5 font-semibold text-red-700 hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FiTrash2 size={10} aria-hidden="true" />
                              <span>{isDeletingMessageId === msg.id ? "Deleting…" : "Delete"}</span>
                            </button>
                          )}
                        </div>
                        {isMine ? (
                          <div
                            className="inline-flex items-center gap-1 overflow-hidden text-[0.65rem] text-slate-500 transition-all max-h-0 opacity-0 group-hover:mt-0.5 group-hover:max-h-6 group-hover:opacity-100 group-focus-within:mt-0.5 group-focus-within:max-h-6 group-focus-within:opacity-100"
                          >
                            <span>{formatTime(msg.created_at)}</span>
                            <MessageStatus isRead={Boolean(msg.is_read)} />
                          </div>
                        ) : (
                          <p
                            className="overflow-hidden text-[0.65rem] text-slate-500 transition-all max-h-0 opacity-0 group-hover:mt-0.5 group-hover:max-h-6 group-hover:opacity-100 group-focus-within:mt-0.5 group-focus-within:max-h-6 group-focus-within:opacity-100"
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              });
              return [
                ...filteredMessages,
                <li key="unmatched-badge-immediate" className="py-2 text-center">
                  <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-[0.9rem] font-semibold text-yellow-800">
                    You unmatched{dateStr ? ` on ${dateStr}` : ''}
                  </span>
                </li>
              ];
            }

            return messages.map((msg, index) => {
              const isMine = Number(msg.sender_user_id) === currentUserId;
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
              const startsNewDay =
                !prevMsg ||
                getMessageDateKey(prevMsg.created_at) !== getMessageDateKey(msg.created_at);
              const hasQuotedContent = isQuotedMessageContent(msg.content);
              const messageId = msg.id != null ? String(msg.id) : `idx-${index}`;

              if (index === showIdx && showType === 'matched') {
                return (
                  <li key={msg.id != null ? `msg-matched-${msg.id}` : `msg-matched-${index}-${msg.created_at ?? ""}`}
                      className="py-2 text-center">
                    <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[0.9rem] font-semibold text-red-700">
                      You matched{showDate ? ` on ${showDate}` : ''}
                    </span>
                  </li>
                );
              }
              if (index === showIdx && showType === 'unmatched') {
                return (
                  <li key={msg.id != null ? `msg-unmatched-${msg.id}` : `msg-unmatched-${index}-${msg.created_at ?? ""}`}
                      className="py-2 text-center">
                    <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-[0.9rem] font-semibold text-yellow-800">
                      You unmatched{showDate ? ` on ${showDate}` : ''}
                    </span>
                  </li>
                );
              }

              // Masque tous les autres messages système matched/unmatched
              if (matchedRegex.test(msg.content) || unmatchedRegex.test(msg.content)) {
                return null;
              }

              return (
                <li
                  key={
                    msg.id != null
                      ? `msg-${msg.id}`
                      : `msg-${index}-${msg.created_at ?? ""}`
                  }
                  data-message-id={messageId}
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
                    <div className={`group relative flex max-w-[62%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenedTimestampId(messageId);
                          handleOpenMessageActions(messageId);
                        }}
                        className={
                          hasQuotedContent
                            ? "cursor-pointer text-left"
                            : `${chatBubbleClass} cursor-pointer text-left ${
                                isMine
                                  ? "from-brand to-brand-deep bg-gradient-to-r border-transparent text-white shadow-lg"
                                  : "border-slate-200 bg-slate-100 text-slate-900"
                              }`
                        }
                      >
                        <MessageBody content={msg.content} isMine={isMine} />
                      </button>
                      <div
                        className={`absolute top-full z-10 mt-2 flex gap-2 text-[0.65rem] text-slate-500 transition-all duration-150 ${selectedMessageId === messageId ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"} ${isMine ? "right-0 justify-end" : "left-0 justify-start"}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleQuoteMessage(msg)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold hover:border-slate-300 hover:text-slate-700"
                        >
                          <FiCornerUpLeft size={10} aria-hidden="true" />
                          <span>Quote</span>
                        </button>
                        {isMine && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg)}
                            disabled={isDeletingMessageId === msg.id}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2 py-0.5 font-semibold text-red-700 hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiTrash2 size={10} aria-hidden="true" />
                            <span>{isDeletingMessageId === msg.id ? "Deleting…" : "Delete"}</span>
                          </button>
                        )}
                      </div>
                      {isMine ? (
                        <div
                          className="inline-flex items-center gap-1 overflow-hidden text-[0.65rem] text-slate-500 transition-all max-h-0 opacity-0 group-hover:mt-0.5 group-hover:max-h-6 group-hover:opacity-100 group-focus-within:mt-0.5 group-focus-within:max-h-6 group-focus-within:opacity-100"
                        >
                          <span>{formatTime(msg.created_at)}</span>
                          <MessageStatus isRead={Boolean(msg.is_read)} />
                        </div>
                      ) : (
                        <p
                          className="overflow-hidden text-[0.65rem] text-slate-500 transition-all max-h-0 opacity-0 group-hover:mt-0.5 group-hover:max-h-6 group-hover:opacity-100 group-focus-within:mt-0.5 group-focus-within:max-h-6 group-focus-within:opacity-100"
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            });
          })()}
        </ul>
      </div>

      {canSendMessages && (
        <form onSubmit={handleSend} className="space-y-2">
          {quotedMessage && (
            <div className="rounded-2xl border border-brand/20 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-deep/80">
                  Quoting {getMessageAuthorLabel(quotedMessage, currentUser, conversation)}
                </p>
                <button
                  type="button"
                  onClick={() => setQuotedMessage(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>
              <p className="mt-1 max-h-10 overflow-hidden whitespace-pre-wrap break-words text-sm leading-snug text-slate-600">
                {buildQuotePreviewText(quotedMessage, currentUser, conversation)}
              </p>
            </div>
          )}
          <textarea
            rows={2}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className={chatInputClass}
            placeholder="Write a message..."
            disabled={isSending}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
          />
          <p className="text-xs text-slate-500 text-right">
            {composedMessageLength}/{MAX_CHAT_MESSAGE_LENGTH}
          </p>
          <div className="flex justify-end">
            <button
              type="submit"
              className={chatButtonClass(isSending || !composedMessageLength || composedMessageLength > MAX_CHAT_MESSAGE_LENGTH)}
              disabled={isSending || !composedMessageLength || composedMessageLength > MAX_CHAT_MESSAGE_LENGTH}
            >
              {isSending ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
