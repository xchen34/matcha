import { useMemo } from "react";
import { getLatestPerActorAndType } from "../utils/notificationUtils.js";

export function useNotificationGroups(notifications) {
  return useMemo(() => {
    // Collapse repeated unread notifications so each actor/type only contributes once.
    const finalUnreadItems = getLatestPerActorAndType(notifications, true);

    // Map backend notification types to the UI sections and copy we want to show.
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

    // Build one summary card per notification type, ordered by recency.
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

    // Put the newest activity at the top of the list.
    return groups.sort((a, b) => {
      const aTime = new Date(a.latestAt || 0).getTime();
      const bTime = new Date(b.latestAt || 0).getTime();

      return bTime - aTime;
    });
  }, [notifications]);
}
