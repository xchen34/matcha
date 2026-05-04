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

export function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

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
