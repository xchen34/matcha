import { useCallback, useEffect, useState } from "react";
import { FiMessageSquare } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { onRealtimeEvent } from "../realtime/socket.js";
import { fetchChatConversations } from "./api.js";

const POLL_INTERVAL_MS = 15000;

export default function ChatIndicator({ currentUser }) {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadTrigger, setLoadTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadChats = useCallback(async () => {
    if (!currentUser?.id) {
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchChatConversations(currentUser);
      const pathname = location.pathname || "";
      const pathSegments = pathname.split("/").filter(Boolean);
      const activeConversationId =
        pathSegments[0] === "messages" && pathSegments[1]
          ? Number(pathSegments[1])
          : null;
      const totalUnread = Array.isArray(data.conversations)
        ? data.conversations.reduce((acc, conv) => {
            if (
              activeConversationId &&
              Number(conv.conversation_id) === Number(activeConversationId)
            ) {
              return acc;
            }
            return acc + (Number(conv.unread_count) || 0);
          }, 0)
        : 0;
      setUnreadCount(totalUnread);
    } catch {
      // Keep the indicator resilient even when the chats endpoint fails briefly.
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, location.pathname]);

  useEffect(() => {
    loadChats();
  }, [loadChats, loadTrigger]);

  useEffect(() => {
    const intervalId = window.setInterval(loadChats, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadChats]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    const off = onRealtimeEvent("chat:message:created", () => {
      setLoadTrigger((prev) => prev + 1);
    });
    return () => {
      off();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (location.pathname.startsWith("/messages")) {
      setLoadTrigger((prev) => prev + 1);
    }
  }, [location.pathname, currentUser?.id]);

  const pathname = location.pathname || "";
  if (!currentUser?.id) {
    return null;
  }

  return (
    <Link
      to="/messages"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white/90 text-slate-700 hover:bg-white"
      aria-label="Open direct messages"
      title="Messages"
    >
      <FiMessageSquare size={18} />
      {unreadCount > 0 && (
        <span className="pointer-events-none absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      {isLoading && (
        <span className="sr-only">Refreshing chat indicator</span>
      )}
    </Link>
  );
}
