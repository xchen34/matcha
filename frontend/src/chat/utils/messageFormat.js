/* Date formatting */
export function formatDayLabel(value) {
  const date = new Date(value);
  
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

/* Time formatting */
export function formatTime(value) {
  const date = new Date(value);
  
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/* Grouping key for messages by day */
export function dateKey(value) {
  const date = new Date(value);
  
  if (Number.isNaN(date.getTime())) return "";
  
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/* Message deduplication */
export function dedupeMessages(messages) {
  const seen = new Set();
  const output = [];
  
  for (const msg of Array.isArray(messages) ? messages : []) {
    const id = msg?.id == null ? null : String(msg.id);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    output.push(msg);
  }
  return output;
}

/* Relative timestamp formatting for message previews */
export function formatTimestamp(value) {
  if (!value) return "";
  
  const date = new Date(value);
  
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = Date.now();
  const diffMinutes = Math.floor((now - date.getTime()) / 60000);
  
  if (diffMinutes < 1) {
    return "just now";
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  
  if (diffMinutes < 24 * 60) {
    return `${Math.floor(diffMinutes / 60)}h ago`;
  }
  
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}