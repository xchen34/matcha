/* ========== Convert bytes to kilobytes ========== */
export function bytesToKB(value) {
  return Math.round(value / 1024);
}

/* ========== Build API headers with optional user ID for authentication ========== */
export function buildApiHeaders(currentUser, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  
  if (currentUser?.id) {
    headers["x-user-id"] = String(currentUser.id);
  }

  return headers;
}