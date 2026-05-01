export function createEmptyModeSets() {
  return {
    views: new Set(),
    likes: new Set(),
    matches: new Set(),
  };
}

export function hasAnyModeAttention(modeSets) {
  return (
    modeSets.views.size > 0 ||
    modeSets.likes.size > 0 ||
    modeSets.matches.size > 0
  );
}

export function mapTypeToMode(type) {
  if (type === "profile_view") return "views";
  if (type === "like_received") return "likes";
  if (type === "match") return "matches";
  return null;
}

export function getActorUserId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return String(parsed);
}

export function getLatestPerActorAndType(items, unreadOnly = false) {
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

export function deriveAttentionFromNotifications(items) {
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

export function sortByNewest(items) {
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