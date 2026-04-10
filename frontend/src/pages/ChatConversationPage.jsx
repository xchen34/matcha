import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { onRealtimeEvent } from "../realtime/socket.js";
import {
  fetchConversationMessages,
  sendChatMessage,
} from "../chat/api.js";

const chatBubbleClass =
  "max-w-[62%] rounded-2xl border border-slate-200 px-3 py-1 text-sm leading-tight shadow-sm";
const chatInputClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition min-h-[72px]";
const chatButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-4 py-3 text-base font-semibold text-white shadow-lg shadow-orange-200/60 hover:-translate-y-0.5 transition";

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

function playMessageTone() {
  if (typeof window === "undefined") return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 560;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => {
      if (ctx.state !== "closed") {
        ctx.close().catch(() => {});
      }
    };
  } catch (error) {
    // Ignore if browsers block audio context creation
  }
}

export default function ChatConversationPage({ currentUser }) {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  const loadConversation = useCallback(async () => {
    if (!currentUser?.id || !conversationId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchConversationMessages(currentUser, conversationId);
      setMessages(
        Array.isArray(data.messages)
          ? dedupeMessages(data.messages)
          : [],
      );
      setConversation(data.conversation || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    seenMessageIdsRef.current = new Set();
    initialLoadRef.current = true;
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

    if (shouldPlay) {
      playMessageTone();
    }
  }, [messages, currentUser?.id]);

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
      });

    return () => {
      off();
    };
  }, [currentUser?.id, conversation?.id]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

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

  return (
    <section className="mx-auto max-w-xl w-full space-y-5 px-3 sm:px-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">{displayName}</h2>
          <p className="text-sm text-slate-500">
            {conversation?.other_user?.is_online ? "Currently online" : "Offline"}
          </p>
        </div>
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
      </header>

      {error && (
        <p className="text-sm text-amber-600">{error}</p>
      )}

      <div
        ref={listRef}
        className="flex max-h-[320px] w-full flex-col gap-1 overflow-y-auto rounded-3xl border-2 border-slate-200 bg-white/90 px-3 py-3 shadow-sm"
      >
        {loading && <p className="text-sm text-slate-500">Loading messages...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Start the dialog by sending your first message.
          </p>
        )}
        <ul className="space-y-1">
          {messages.map((msg, index) => {
            const isMine = Number(msg.sender_user_id) === currentUser.id;
            return (
              <li
                key={
                  msg.id != null
                    ? `msg-${msg.id}`
                    : `msg-${index}-${msg.created_at ?? ""}`
                }
                className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`${chatBubbleClass} ${
                    isMine
                      ? "from-brand to-brand-deep bg-gradient-to-r text-white shadow-lg"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p
                    className={`mt-0.5 text-[0.65rem] ${
                      isMine ? "text-white/80" : "text-slate-500"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
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
