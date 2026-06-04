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

/* ========== Token utilities ========== */
function decodeBase64Url(value) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);
    return atob(padded);
  } catch {
    return "";
  }
}

export function getTokenExpiryEpochSeconds(token) {
  if (typeof token !== "string") return 0;
  const parts = token.split(".");
  if (parts.length !== 2) return 0;

  const payloadRaw = decodeBase64Url(parts[0]);
  if (!payloadRaw) return 0;

  try {
    const payload = JSON.parse(payloadRaw);
    const exp = Number(payload?.exp);
    return Number.isInteger(exp) ? exp : 0;
  } catch {
    return 0;
  }
}

export function shouldRefreshToken(token, thresholdSeconds = 120) {
  const exp = getTokenExpiryEpochSeconds(token);
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp - now <= thresholdSeconds;
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
