export const MODE_CONFIG = {
  views: {
    title: "Who viewed me",
    subtitle: "People who opened your profile.",
    endpoint: "/api/profile/views",
    emptyText: "No views yet.",
    helperText: "Viewed your profile",
  },
  likes: {
    title: "Who liked me",
    subtitle: "People who liked your profile.",
    endpoint: "/api/profile/likes",
    emptyText: "No likes yet.",
    helperText: "Liked your profile",
  },
  matches: {
    title: "Who matched me",
    subtitle: "People who liked you back.",
    endpoint: "/api/profile/matches",
    emptyText: "No matches yet.",
    helperText: "Mutual like",
  },
};

/* Upsert user by ID into a list, if it exists, update it; otherwise, add it */
export function upsertUserById(list, user, mode) {
  const userId = Number(user?.id);
  if (!Number.isInteger(userId) || userId <= 0) return list;

  const timeField = mode === "matches" ? "matched_at" : "created_at";
  const incomingTs = new Date(user?.[timeField] || 0).getTime();

  /* If user doesn't exist, add to the top */
  const idx = list.findIndex((item) => Number(item?.id) === userId);
  if (idx < 0) {
    return [user, ...list];
  }

  /* If user exists, update info */
  const next = [...list];
  const current = next[idx] || {};
  const currentTs = new Date(current?.[timeField] || 0).getTime();
  next[idx] = {
    ...current,
    ...user,
    [timeField]:
      Number.isFinite(incomingTs) && incomingTs >= currentTs
        ? user?.[timeField]
        : current?.[timeField],
  };
  return next;
}

/* Remove user by ID from a list */
export function removeUserById(list, userId) {
  const parsed = Number(userId);
  if (!Number.isInteger(parsed) || parsed <= 0) return list;
  return list.filter((item) => Number(item?.id) !== parsed);
}
