/* ========== Convert bytes to kilobytes ========== */
export function bytesToKB(value) {
  return Math.round(value / 1024);
}

/* ========== Build API headers with optional user ID for authentication ========== */
export function buildApiHeaders(currentUser, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  
  if (currentUser?.realtime_token) {
    headers["Authorization"] = `Bearer ${currentUser.realtime_token}`;
  }

  return headers;
}