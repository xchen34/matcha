import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onRealtimeEvent } from "@/realtime/socket.js";
import ChatAvatar from "./ChatAvatar.jsx";
import { fetchChatConversations } from "../hooks/api.js";
import { actionButtonClass, notificationBadgeClass } from "@/styles/UIClasses.jsx";
import { MessageSquareHeart } from "lucide-react";
import { toDisplayHandle, toAvatarName, formatPreview } from "../utils/chatIndicatorUtils.js";

const POLL_INTERVAL_MS = 15000;
const SHORTCUT_LIMIT = 6;

export default function ChatIndicator({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  /*  ========== LOAD CONVERSATIONS & UNREAD COUNT ========== */
  const loadChats = useCallback(async () => {
    if (!currentUser?.id) {
      setUnreadCount(0);
      setConversations([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const data = await fetchChatConversations(currentUser);
      const safeConversations = Array.isArray(data.conversations)
        ? data.conversations
        : [];
      
      setConversations(safeConversations);

      /* Detect active conversation from URL */
      const pathname = location.pathname || "";
      const pathSegments = pathname.split("/").filter(Boolean);
      const activeConversationId =
        pathSegments[0] === "messages" && pathSegments[1]
          ? Number(pathSegments[1])
          : null;
      
      /* Calculate total unread count, excluding active conversation */
      const totalUnread = safeConversations.reduce((acc, conv) => {
        if (
          activeConversationId &&
          Number(conv.conversation_id) === Number(activeConversationId)
        ) {
          return acc;
        }
        return acc + (Number(conv.unread_count) || 0);
      }, 0);

      setUnreadCount(totalUnread);
    } catch {
      // Keep the indicator resilient even when the chats endpoint fails briefly.
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, location.pathname]);

  /*  ========== INITIAL LOAD & POLLING ========== */
  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    const intervalId = window.setInterval(loadChats, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadChats]);

  /*  ========== REALTIME UPDATES ========== */
  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const off = onRealtimeEvent("chat:message:created", () => {
      void loadChats();
    });
    
    return () => off();
  }, [currentUser?.id, loadChats]);

  /*  ========== CLOSE OUTSIDE CLICK OR ESCAPE ========== */
  useEffect(() => {
    if (!isOpen) return undefined;

    function onDocMouseDown(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function onEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  /*  ========== SHORTCUTS (Sorted & limited) ========== */
  const shortcuts = useMemo(() => {
    const sorted = [...conversations].sort((left, right) => {
      const leftUnread = Number(left?.unread_count) || 0;
      const rightUnread = Number(right?.unread_count) || 0;

      if (leftUnread !== rightUnread) {
        return rightUnread - leftUnread;
      }

      const leftTime = new Date(left?.last_message?.created_at || 0).getTime();
      const rightTime = new Date(right?.last_message?.created_at || 0).getTime();
      
      return rightTime - leftTime;
    });

    return sorted.slice(0, SHORTCUT_LIMIT);
  }, [conversations]);

  /*  ========== NAVIGATION ========== */
  function openConversation(conversationId) {
    setIsOpen(false);
    navigate(`/messages/${conversationId}`);
  }

  function openInbox() {
    setIsOpen(false);
    navigate("/messages");
  }

  if (!currentUser?.id) return null;

  return (
    <div ref={containerRef} className="relative">
      {/* ========== TOGGLE BUTTON ========== */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary bg-white/90 text-slate-700 hover:bg-white"
        aria-label="Open direct messages shortcuts"
        title="Messages"
      >
        <MessageSquareHeart color="#f163cf" size={24} />
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className={notificationBadgeClass}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ========== DROPDOWN ========== */}
      {isOpen && (
        <div className="fixed left-2 right-2 top-16 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
          {/* LIST */}
          <div className="max-h-80 overflow-y-auto px-1 py-1">
            {shortcuts.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-500">
                No conversations yet.
              </p>
            ) : (
              shortcuts.map((conv) => {
                const displayName = toDisplayHandle(conv.other_user);
                const avatarName = toAvatarName(conv.other_user);

                return (
                  <button
                    key={conv.conversation_id}
                    type="button"
                    onClick={() => openConversation(conv.conversation_id)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-primary-light"
                  >
                    <ChatAvatar
                      name={avatarName}
                      photoUrl={conv.other_user?.primary_photo_url || ""}
                      isOnline={Boolean(conv.other_user?.is_online)}
                      sizeClass="h-10 w-10"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                      <p className="truncate text-xs text-slate-500">{formatPreview(conv.last_message)}</p>
                    </div>

                    {Number(conv.unread_count) > 0 && (
                      <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-primary-dark px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* VIEW MORE BUTTON */}
          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              onClick={openInbox}
              className={`w-full ${actionButtonClass}`}
            >
              View more
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
