import { useCallback, useEffect, useMemo, useState } from "react";
import { buildApiHeaders } from "@/utils/utils.js";
import { getRealtimeSocket, onRealtimeEvent } from "@/realtime/socket.js";
import { 
  createEmptyModeSets, 
  mapTypeToMode, 
  getLatestPerActorAndType,
  deriveAttentionFromNotifications,
  sortByNewest } 
from "./utils/notificationUtils.js";
import { NotificationsContext } from "./hooks/useNotifications.js";
import { useNotificationInsights } from "./hooks/useNotificationInsights.js";
import { useNotificationGroups } from "./hooks/useNotificationGroups.js";

/**
 * Provides notification state and actions to the rest of the app.
 *
 * The provider owns the canonical notification list, unread counters, read
 * actions, attention badges, and realtime synchronization. Consumers can
 * subscribe to this context to render the bell, dropdown, grouped sections, or
 * any badge driven UI without repeating the fetch and websocket logic.
 */
export function NotificationsProvider({ currentUser, children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Track which actor user IDs should still be highlighted per popularity
  // mode. This powers the small attention dot / badge behavior in the UI.
  const [attentionUsersByMode, setAttentionUsersByMode] = useState(createEmptyModeSets);

  // Load the current notification snapshot from the API and normalize it into
  // newest-first order.
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
      setAttentionUsersByMode(deriveAttentionFromNotifications(list));
    } catch {
      setError("Network error while loading notifications.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Mark every notification as read in the backend, then mirror that state in
  // memory so the unread counter drops immediately.
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

  // Mark one notification as read, but only if it still exists and is not
  // already marked read in local state.
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

  // Derive the unread count from the current notification list whenever the
  // list changes. This keeps the counter consistent with local state.
  useEffect(() => {
    setUnreadCount(getLatestPerActorAndType(notifications, true).length);
  }, [notifications]);

  // Trigger the first API load when the authenticated user changes. If the app
  // logs out, reset the provider state immediately.
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    return undefined;
  }, [currentUser, fetchNotifications]);

  // Listen for push notifications and merge them into local state without a
  // full refetch. Duplicate IDs are removed before the new event is inserted.
  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const offNotificationCreated = onRealtimeEvent(
      "notification:created",
      (payload) => {
        const incoming = payload?.notification;
        
        if (!incoming || Number(incoming.user_id) !== Number(currentUser.id)) {
          return;
        }

        // Keep the newest version of the notification and drop any stale copy
        // with the same ID.
        setNotifications((prev) => {
          const deduped = prev.filter((item) => item.id !== incoming.id);
          return sortByNewest([incoming, ...deduped]);
        });

        // Highlight the relevant popularity section when a notification comes
        // in for one of the supported relation modes.
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

  // If the socket reconnects, fetch the canonical notification list again to
  // recover from any missed realtime events.
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

  // Derived views that shape the notification list into grouped sections and
  // per-mode unread summaries for the UI layer.
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

  // Clear the highlight state for one specific mode while leaving the others
  // untouched.
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

  // Clear every mode highlight in one go.
  const clearAttentionDots = useCallback(() => {
    setAttentionUsersByMode(createEmptyModeSets());
  }, []);

  // Memoize the context value so consumers only re-render when one of the
  // public notification fields actually changes.
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
