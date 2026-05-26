import { readStoredUser } from "./userStorage.js";

/* ========== Convert bytes to kilobytes ========== */
export function bytesToKB(value) {
  return Math.round(value / 1024);
}

/* ========== Build API headers with optional user ID for authentication ========== */
export function buildApiHeaders(currentUser, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  
  let token = currentUser?.realtime_token;
  if (!token) {
    const stored = readStoredUser();
    token = stored?.realtime_token;
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/* ========== Capitalize first letter and add # for tags  ========== */
export function formatTag(tag) {
  if (!tag) return "";

  if (tag.startsWith("#")) {
    return "#" + tag[1].toUpperCase() + tag.slice(2);
  }
  
  return tag;
}

/* ========== Capitalize first letter for display (keeps empty/null safe) ========== */
export function capitalizeFirst(str) {
  if (!str) return "";
  const s = String(str).trim();
  
  if (!s) return "";
  
  return s.charAt(0).toUpperCase() + s.slice(1);
}