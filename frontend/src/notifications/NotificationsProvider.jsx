import { useCallback, useEffect, useMemo, useState } from "react";
import { buildApiHeaders } from "../utils.js";
import { getRealtimeSocket, onRealtimeEvent } from "../realtime/socket.js";
import { NotificationsContext } from "./useNotifications.js";

function createEmptyModeSets() {
  return {
    views: new Set(),
    likes: new Set(),
    matches: new Set(),
  };
}

function hasAnyModeAttention(modeSets) {
  return (
    modeSets.views.size > 0 ||
    modeSets.likes.size > 0 ||
    modeSets.matches.size > 0
  );
}

function mapTypeToMode(type) {
  if (type === "profile_view") return "views";
  if (type === "like_received") return "likes";
  if (type === "match") return "matches";
  return null;
}

function getActorUserId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return String(parsed);
}

function getLatestPerActorAndType(items, unreadOnly = false) {
  const latestByActorAndType = new Map();
  for (const item of sortByNewest(items)) {
    if (unreadOnly && item.is_read) continue;
    const actorUserId = getActorUserId(item.actor_user_id);
    if (!actorUserId) continue;
    const key = `${actorUserId}:${item.type}`;
    if (!latestByActorAndType.has(key)) {
      latestByActorAndType.set(key, item);
    }
  }
  return Array.from(latestByActorAndType.values());
}

function deriveAttentionFromNotifications(items) {
  const finalUnreadItems = getLatestPerActorAndType(items, true);
  const result = createEmptyModeSets();
  for (const item of finalUnreadItems) {
    const mode = mapTypeToMode(item.type);
    const actorUserId = getActorUserId(item.actor_user_id);
    if (!mode || !actorUserId) {
      continue;
    }
    result[mode].add(actorUserId);
  }
  return result;
}

function sortByNewest(items) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime();
    const bTime = new Date(b?.created_at || 0).getTime();
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    if (bTime !== aTime) return bTime - aTime;

    const aId = Number(a?.id || 0);
    const bId = Number(b?.id || 0);
    return bId - aId;
  });
}

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

  const notificationInsights = useMemo(() => {
    const finalUnreadItems = getLatestPerActorAndType(notifications, true);
    const sectionSets = {
      views: new Set(),
      likes: new Set(),
    };
    const modeSets = {
      views: new Set(),
      likes: new Set(),
      matches: new Set(),
    };
    const sectionCounts = {
      views: 0,
      likes: 0,
    };
    const modeCounts = {
      views: 0,
      likes: 0,
      matches: 0,
    };

    const typeToSection = {
      profile_view: "views",
      like_received: "likes",
      match: "likes",
      unlike: "likes",
    };

    const typeToMode = {
      profile_view: "views",
      like_received: "likes",
      match: "matches",
    };

    for (const item of finalUnreadItems) {
      const section = typeToSection[item.type];
      const mode = typeToMode[item.type];

      if (section) {
        sectionCounts[section] += 1;
      }
      if (mode) {
        modeCounts[mode] += 1;
      }

      const userId = getActorUserId(item.actor_user_id);
      if (!userId) continue;
      if (section) {
        sectionSets[section].add(userId);
      }
      if (mode) {
        modeSets[mode].add(userId);
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
      unreadUsersByMode: modeSets,
      modeBadges: {
        views: modeCounts.views > 0,
        likes: modeCounts.likes > 0,
        matches: modeCounts.matches > 0,
      },
      modeCounts,
      overflowSection,
    };
  }, [notifications]);

  const notificationGroups = useMemo(() => {
    const finalUnreadItems = getLatestPerActorAndType(notifications, true);
    const definitions = {
      profile_view: {
        section: "views",
        verb: "viewed",
        label: "New profile view",
      },
      like_received: {
        section: "likes",
        verb: "liked",
        label: "New like",
      },
      unlike: {
        section: "likes",
        verb: "unliked",
        label: "Like removed",
      },
      match: {
        section: "matches",
        verb: "matched with",
        label: "New match",
      },
    };

    const groups = [];
    for (const [type, def] of Object.entries(definitions)) {
      const items = finalUnreadItems.filter((item) => item.type === type);
      if (items.length === 0) continue;

      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const primary = items[0];
      const primaryActor = primary.actor_username || "Someone";

      groups.push({
        type,
        count: items.length,
        section: def.section,
        verb: def.verb,
        label: def.label,
        primaryActor,
        latestAt: primary.created_at,
      });
    }

    return groups.sort((a, b) => {
      const aTime = new Date(a.latestAt || 0).getTime();
      const bTime = new Date(b.latestAt || 0).getTime();
      return bTime - aTime;
    });
  }, [notifications]);

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

