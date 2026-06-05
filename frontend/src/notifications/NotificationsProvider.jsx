import { useCallback, useEffect, useMemo, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";
import { getRealtimeSocket, onRealtimeEvent } from "@/realtime/socket.js";
import { 
  createEmptyModeSets, 
  mapTypeToMode, 
  getLatestPerActorAndType,
  sortByNewest } 
from "./utils/notificationUtils.js";
import { NotificationsContext } from "./hooks/useNotifications.js";
import { useNotificationInsights } from "./hooks/useNotificationInsights.js";
import { useNotificationGroups } from "./hooks/useNotificationGroups.js";

export function NotificationsProvider({ currentUser, children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Track which users have triggered new notifications by mode for attention badges */
  const [attentionUsersByMode, setAttentionUsersByMode] = useState(createEmptyModeSets);

  /* ========== Fetch notifications ========== */
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setError("");
      setAttentionUsersByMode(createEmptyModeSets());
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/notifications", {
        headers: buildApiHeaders(currentUser),
        cache: "no-store",
      });

      if (!response.ok) {
        setError("Unable to load notifications right now.");
        return;
      }

      const data = await response.json();
      const list = Array.isArray(data.notifications) ? sortByNewest(data.notifications) : [];
      
      setNotifications(list);
    } catch {
      setError("Network error while loading notifications.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  /* ========== Mark notifications as read ========== */
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;

    setError("");

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: buildApiHeaders(currentUser),
      });

      if (!response.ok) {
        setError("Unable to mark notifications as read.");
        return;
      }

      // Got it: Mark all as read
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      setError("Network error while updating notifications.");
    }
  }, [currentUser]);

  /* Mark a single notification as read */
  const markNotificationAsRead = useCallback(
    async (notificationId) => {
      if (!currentUser || !notificationId) return;

      // Skip if already read
      const existing = notifications.find((item) => item.id === notificationId);
      if (!existing || existing.is_read) return;

      setError("");

      try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, 
          {
            method: "POST",
            headers: buildApiHeaders(currentUser),
          }
        );

        if (!response.ok) {
          setError("Unable to mark this notification as read.");
          return;
        }

        // Mark specific notification as read
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notificationId ? { ...item, is_read: true } : item,
          ),
        );
      } catch {
        setError("Network error while updating notifications.");
      }
    },
    [currentUser, notifications],
  );

  /* ========== Update unread count ========== */
  useEffect(() => {
    setUnreadCount(getLatestPerActorAndType(notifications, true).length);
  }, [notifications]);

  /* ========== Initial load ========= */
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    return undefined;
  }, [currentUser, fetchNotifications]);

  /* ========== Realtime : New notifications ========== */
  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const offNotificationCreated = onRealtimeEvent(
      "notification:created",
      (payload) => {
        const incoming = payload?.notification;
        
        if (!incoming || Number(incoming.user_id) !== Number(currentUser.id)) {
          return;
        }

        // Add new notification to list
        setNotifications((prev) => {
          const deduped = prev.filter((item) => item.id !== incoming.id);
          return sortByNewest([incoming, ...deduped]);
        });

        // Update attention badge per mode
        const mode = mapTypeToMode(incoming.type);
        const parsedActorUserId = Number(incoming.actor_user_id);
        
        if (mode && Number.isInteger(parsedActorUserId) && parsedActorUserId > 0) {
          const actorUserId = String(parsedActorUserId);
          
          setAttentionUsersByMode((prev) => {
            const next = {
              views: new Set(prev.views),
              likes: new Set(prev.likes),
              matches: new Set(prev.matches),
            };
            
            next[mode].add(actorUserId);
            
            return next;
          });
        }
      },
    );

    return () => {
      offNotificationCreated();
    };
  }, [currentUser?.id]);

  /* ========== Realtime : Sync on connect (in case of missed events) ========== */
  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const socket = getRealtimeSocket();

    function syncNotifications() {
      void fetchNotifications();
    }

    socket.on("connect", syncNotifications);

    return () => {
      socket.off("connect", syncNotifications);
    };
  }, [currentUser?.id, fetchNotifications]);

  /* ========== Insights and groups ========== */
  const notificationInsights = useNotificationInsights(notifications);
  const notificationGroups = useNotificationGroups(notifications);

  // Calculate the counts of notification
  const attentionBadges = useMemo(
    () => ({
      views: attentionUsersByMode.views.size,
      likes: attentionUsersByMode.likes.size,
      matches: attentionUsersByMode.matches.size,
    }),
    [attentionUsersByMode],
  );

  /* ========== Clear attention for mode (attention/dot) ========== */
  const clearAttentionMode = useCallback((mode) => {
    if (!mode || !["views", "likes", "matches"].includes(mode)) {
      return;
    }

    setAttentionUsersByMode((prev) => {
      const next = {
        views: new Set(prev.views),
        likes: new Set(prev.likes),
        matches: new Set(prev.matches),
      };
      next[mode].clear();
      return next;
    });
  }, []);

  const clearAttentionDots = useCallback(() => {
    setAttentionUsersByMode(createEmptyModeSets());
  }, []);

  /* ========== Context value ========== */
  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      isAuthenticated: Boolean(currentUser?.id),
      refresh: fetchNotifications,
      markAllAsRead,
      markNotificationAsRead,
      unreadUsersBySection: notificationInsights.unreadUsersBySection,
      sectionBadges: notificationInsights.sectionBadges,
      unreadUsersByMode: notificationInsights.unreadUsersByMode,
      modeBadges: notificationInsights.modeBadges,
      attentionUsersByMode,
      attentionBadges,
      clearAttentionMode,
      clearAttentionDots,
      overflowSection: notificationInsights.overflowSection,
      notificationGroups,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      currentUser,
      fetchNotifications,
      markAllAsRead,
      markNotificationAsRead,
      notificationInsights,
      attentionUsersByMode,
      attentionBadges,
      clearAttentionMode,
      clearAttentionDots,
      notificationGroups,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}