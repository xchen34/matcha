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
  if (type === "like_received" || type === "unlike") return "likes";
  if (type === "match") return "matches";
  return null;
}

function deriveAttentionFromNotifications(items) {
  const result = createEmptyModeSets();
  for (const item of items) {
    if (item.is_read) continue;
    const mode = mapTypeToMode(item.type);
    const parsedUserId = Number(item.actor_user_id);
    if (!mode || !Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      continue;
    }
    result[mode].add(String(parsedUserId));
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
      setUnreadCount(
        Number.isFinite(data.unread_count)
          ? data.unread_count
          : list.filter((item) => !item.is_read).length,
      );

      const derivedAttention = deriveAttentionFromNotifications(list);
      setAttentionUsersByMode((prev) => {
        if (hasAnyModeAttention(prev)) {
          return prev;
        }
        return derivedAttention;
      });
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
        setUnreadCount((prev) => {
          if (incoming.is_read) return prev;
          return prev + 1;
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
      unlike: "likes",
    };

    const getUserId = (value) => {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) return null;
      return String(parsed);
    };

    for (const item of notifications) {
      const section = typeToSection[item.type];
      const mode = typeToMode[item.type];
      if (!item.is_read && section) {
        sectionCounts[section] += 1;
      }

      if (!item.is_read && mode) {
        modeCounts[mode] += 1;
      }

      const userId = getUserId(item.actor_user_id);
      if (!item.is_read && userId) {
        if (section) {
          sectionSets[section].add(userId);
        }
        if (mode) {
          modeSets[mode].add(userId);
        }
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
      unlike: {
        section: "likes",
        verb: "取消了喜欢",
        label: "喜欢动态",
      },
      match: {
        section: "matches",
        verb: "和你互相喜欢",
        label: "互相喜欢",
      },
    };

    const groups = [];
    for (const [type, def] of Object.entries(definitions)) {
      const items = notifications.filter((item) => item.type === type);
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
      views: attentionUsersByMode.views.size > 0,
      likes: attentionUsersByMode.likes.size > 0,
      matches: attentionUsersByMode.matches.size > 0,
    }),
    [attentionUsersByMode],
  );

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

