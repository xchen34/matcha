import { useMemo } from "react";
import { getLatestPerActorAndType, getActorUserId } from "../utils/notificationUtils.js";

export function useNotificationInsights(notifications) {
  return useMemo(() => {
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

      if (section) sectionCounts[section] += 1;
      if (mode) modeCounts[mode] += 1;

      const userId = getActorUserId(item.actor_user_id);
      if (!userId) continue;

      if (section) sectionSets[section].add(userId);
      if (mode) modeSets[mode].add(userId);
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
}