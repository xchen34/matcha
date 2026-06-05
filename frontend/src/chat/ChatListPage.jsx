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

/**
 * 聊天会话列表页（/messages）：
 * - 拉取所有会话
 * - 渲染每条会话卡片（头像、状态、最后消息、未读数）
 * - 结合轮询 + realtime 进行更新
 */
export default function ChatListPage({ currentUser, embedded = false }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  // 从路由 state 读取跨页面动作参数（例如标记已读、移除已删会话）。
  const markId = Number(location.state?.markAsReadConversationId) || null;
  const removedConversationId = Number(location.state?.removedConversationId) || null;
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
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch (err) {
      setError(err?.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // 首次加载。
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 兜底轮询。
  useEffect(() => {
    const intervalId = window.setInterval(loadConversations, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadConversations]);

  // 实时更新逻辑（新消息、会话变更等）。
  useChatListRealtime({
    currentUserId: currentUser?.id,
    conversations,
    setConversations,
    loadConversations,
    markId,
    removedConversationId,
  });

  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }

  const emptyState = !loading && conversations.length === 0;

  return (
    <section className={`flex min-h-0 flex-1 flex-col ${embedded ? "space-y-4" : "space-y-6"}`}>
      {!embedded && (
        <header>
          <h2 className="text-3xl font-bold text-neutral-dark">Direct Messages</h2>
          <p className="text-sm text-slate-500">
            Reach out to anyone you are connected with. Chats are end-to-end in this interface.
          </p>
        </header>
      )}

      {error && <p className="text-sm text-primary-dark">{error}</p>}

      {loading && (
        <div className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
          Loading messages...
        </div>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto pr-1 ${embedded ? "scrollbar-gutter-stable" : ""}`}>
        <ul className={embedded ? "space-y-2" : "space-y-3"}>
          {conversations.map((conv) => {
            const messagePreview = formatQuotedMessagePreview(
              conv.last_message?.content || "No messages yet",
              80,
            );
            const lastMessageTime = formatTimestamp(conv.last_message?.created_at);
            const displayName = toDisplayHandle(conv.other_user);
            const avatarName = toAvatarName(conv.other_user);
            const isDeleted = Boolean(conv.other_user?.is_deleted);

            const statusBadge = isDeleted ? (
              <span className="ml-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                Deleted
              </span>
            ) : conv.blocked_by_you ? (
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
                    hover:-translate-y-[1px] hover:border-primary-medium hover:shadow-md
                    ${embedded ? "p-3" : "p-4"}
                  `}
                >
                  <div className="shrink-0 transition-transform duration-200 group-hover:scale-[1.03]">
                    <ChatAvatar
                      name={avatarName}
                      photoUrl={conv.other_user?.primary_photo_url || ""}
                      isOnline={Boolean(conv.other_user?.is_online)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-base font-semibold text-neutral-dark">{displayName}</p>
                        {statusBadge && <span className="shrink-0">{statusBadge}</span>}
                      </div>

                      {lastMessageTime && (
                        <span className="shrink-0 text-[10px] uppercase tracking-widest text-slate-400">
                          {lastMessageTime}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-slate-500">{messagePreview}</p>

                      {conv.unread_count > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
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

      {emptyState && (
        <p className="text-sm text-slate-500">
          No conversations yet. Once you match with someone, your chat history will appear here.
        </p>
      )}
    </section>
  );
}
