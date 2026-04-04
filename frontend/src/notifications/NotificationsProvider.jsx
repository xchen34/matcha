import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildApiHeaders } from "../utils.js";

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
