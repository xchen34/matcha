import { useCallback, useEffect, useMemo, useState } from "react";
import { buildApiHeaders } from "../utils.js";
import { getRealtimeSocket, onRealtimeEvent } from "../realtime/socket.js";
import { NotificationsContext } from "./hooks/useNotifications.js";
import { createEmptyModeSets, 
  mapTypeToMode, 
  getLatestPerActorAndType,
  sortByNewest } from "./utils/notificationUtils.js";
import { useNotificationInsights } from "./hooks/useNotificationInsights.js";
import { useNotificationGroups } from "./hooks/useNotificationGroups.js";

export function NotificationsProvider({ currentUser, children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attentionUsersByMode, setAttentionUsersByMode] = useState(createEmptyModeSets);

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

      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      setError("Network error while updating notifications.");
    }
  }, [currentUser]);

  const markNotificationAsRead = useCallback(
    async (notificationId) => {
      if (!currentUser || !notificationId) return;

      const existing = notifications.find((item) => item.id === notificationId);
      if (!existing || existing.is_read) return;

      setError("");
      try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: "POST",
          headers: buildApiHeaders(currentUser),
        });

        if (!response.ok) {
          setError("Unable to mark this notification as read.");
          return;
        }

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

  useEffect(() => {
    setUnreadCount(getLatestPerActorAndType(notifications, true).length);
  }, [notifications]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    return undefined;
  }, [currentUser, fetchNotifications]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const offNotificationCreated = onRealtimeEvent(
      "notification:created",
      (payload) => {
        const incoming = payload?.notification;
        if (!incoming || Number(incoming.user_id) !== Number(currentUser.id)) {
          return;
        }

        setNotifications((prev) => {
          const deduped = prev.filter((item) => item.id !== incoming.id);
          return sortByNewest([incoming, ...deduped]);
        });

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

  const notificationInsights = useNotificationInsights(notifications);

  const notificationGroups = useNotificationGroups(notifications);

  const attentionBadges = useMemo(
    () => ({
      views: attentionUsersByMode.views.size,
      likes: attentionUsersByMode.likes.size,
      matches: attentionUsersByMode.matches.size,
    }),
    [attentionUsersByMode],
  );

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