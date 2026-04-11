import { buildApiHeaders } from "../utils.js";

async function handleResponse(response, defaultError) {
  const payload = await response.json().catch(() => ({}));
  if (response.ok) {
    return payload;
  }
  throw new Error(payload?.error || defaultError);
}

export async function fetchChatConversations(currentUser) {
  if (!currentUser?.id) {
    return { conversations: [] };
  }
  const response = await fetch("/api/chats", {
    headers: buildApiHeaders(currentUser),
    cache: "no-store",
  });
  return handleResponse(response, "Unable to load conversations.");
}

export async function fetchConversationMessages(
  currentUser,
  conversationId,
  options = {},
) {
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }

  const limit = Number(options.limit);
  const offset = Number(options.offset);
  const params = new URLSearchParams();
  if (Number.isInteger(limit) && limit > 0) {
    params.set("limit", String(limit));
  }
  if (Number.isInteger(offset) && offset >= 0) {
    params.set("offset", String(offset));
  }

  const query = params.toString();
  const endpoint = query
    ? `/api/chats/${conversationId}/messages?${query}`
    : `/api/chats/${conversationId}/messages`;

  const response = await fetch(endpoint, {
    headers: buildApiHeaders(currentUser),
    cache: "no-store",
  });
  return handleResponse(response, "Unable to load conversation.");
}

export async function markConversationAsRead(currentUser, conversationId) {
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }
  const response = await fetch(`/api/chats/${conversationId}/read`, {
    method: "POST",
    headers: buildApiHeaders(currentUser, {
      "Content-Type": "application/json",
    }),
  });
  return handleResponse(response, "Unable to mark conversation as read.");
}

export async function sendChatMessage(currentUser, recipientUserId, content) {
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }
  const response = await fetch("/api/chats/messages", {
    method: "POST",
    headers: buildApiHeaders(currentUser, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ recipient_user_id: recipientUserId, content }),
  });
  return handleResponse(response, "Unable to send message.");
}

export async function ensureConversationExists(currentUser, otherUserId) {
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }
  if (!Number.isInteger(Number(otherUserId)) || Number(otherUserId) <= 0) {
    throw new Error("Invalid user id");
  }
  const response = await fetch("/api/chats/conversations", {
    method: "POST",
    headers: buildApiHeaders(currentUser, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ other_user_id: Number(otherUserId) }),
  });
  return handleResponse(response, "Unable to open conversation.");
}
