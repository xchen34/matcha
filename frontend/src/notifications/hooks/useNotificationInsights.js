import { useMemo } from "react";
import { getLatestPerActorAndType, getActorUserId } from "../utils/notificationUtils.js";

export function useNotificationInsights(notifications) {
  return useMemo(() => {
    // Reuse the deduplicated unread feed so counts match the grouped cards.
    const finalUnreadItems = getLatestPerActorAndType(notifications, true);

    // Track both totals and unique actors for each UI bucket.
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

    // These maps translate backend notification types into the UI buckets above.
    const typeToMode = {
      profile_view: "views",
      like_received: "likes",
      match: "matches",
    };

    // Count each unread item and collect the unique actor IDs behind it.
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

    // Choose the dominant section so overflow badges stay visually stable.
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
