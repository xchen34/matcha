// Utility function 

export function buildApiHeaders(currentUser, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (currentUser?.id) {
    headers["x-user-id"] = String(currentUser.id);
  }
  return headers;
}