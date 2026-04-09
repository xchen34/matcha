import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildApiHeaders } from "../utils.js";
import { onRealtimeEvent } from "../realtime/socket.js";

const NotificationsContext = createContext(null);
const POLL_INTERVAL_MS = 10000;

export function NotificationsProvider({ currentUser, children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", {
        headers: buildApiHeaders(currentUser),
      });

      if (!response.ok) {
        setError("Unable to load notifications right now.");
        return;
      }

      const data = await response.json();
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(list);
      setUnreadCount(
        Number.isFinite(data.unread_count)
          ? data.unread_count
          : list.filter((item) => !item.is_read).length,
      );
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
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        setError("Network error while updating notifications.");
      }
    },
    [currentUser, notifications],
  );

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
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

        setNotifications((prev) => [incoming, ...prev]);
        setUnreadCount((prev) => prev + (incoming.is_read ? 0 : 1));
      },
    );

    return () => {
      offNotificationCreated();
    };
  }, [currentUser?.id]);

  const notificationInsights = useMemo(() => {
    const sectionSets = {
      views: new Set(),
      likes: new Set(),
    };
    const sectionCounts = {
      views: 0,
      likes: 0,
    };

    const typeToSection = {
      profile_view: "views",
      like_received: "likes",
      match: "likes",
      unlike: "likes",
    };

    const getUserId = (value) => {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) return null;
      return String(parsed);
    };

    for (const item of notifications) {
      if (item.is_read) continue;
      const section = typeToSection[item.type];
      if (!section) continue;
      sectionCounts[section] += 1;
      const userId = getUserId(item.actor_user_id);
      if (userId) {
        sectionSets[section].add(userId);
      }
    }

    const overflowSection =
      sectionCounts.views === 0 && sectionCounts.likes === 0
        ? "views"
        : sectionCounts.views >= sectionCounts.likes
        ? "views"
        : "likes";

    return {
      unreadUsersBySection: sectionSets,
      sectionBadges: {
        views: sectionCounts.views > 0,
        likes: sectionCounts.likes > 0,
      },
      overflowSection,
    };
  }, [notifications]);

  const notificationGroups = useMemo(() => {
    const definitions = {
      profile_view: {
        section: "views",
        verb: "看过",
        label: "谁看过我",
      },
      like_received: {
        section: "likes",
        verb: "点赞了",
        label: "谁喜欢了我",
      },
      match: {
        section: "likes",
        verb: "和你互相喜欢",
        label: "互相喜欢",
      },
      unlike: {
        section: "likes",
        verb: "取消了喜欢",
        label: "喜欢动态",
      },
    };

    const groups = [];
    for (const [type, def] of Object.entries(definitions)) {
      const items = notifications.filter(
        (item) => !item.is_read && item.type === type,
      );
      if (items.length === 0) continue;

      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const primary = items[0];
      const primaryActor = primary.actor_username || "某人";

      groups.push({
        type,
        count: items.length,
        section: def.section,
        verb: def.verb,
        label: def.label,
        primaryActor,
      });
    }

    return groups;
  }, [notifications]);

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
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return ctx;
}
