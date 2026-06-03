import { buildApiHeaders } from "@/utils/utils.js";

// 统一处理 fetch 后的响应。
// 这个 helper 的作用是：
// 1) 先把 JSON 解析出来
// 2) 如果 HTTP 成功，就把数据返回给调用者
// 3) 如果 HTTP 失败，就抛出带 error message 的异常
async function handleResponse(response, defaultError) {
  // 先尝试解析后端返回的 JSON。
  const payload = await response.json().catch(() => ({}));

  // 成功响应就直接返回后端数据。
  if (response.ok) {
    return payload;
  }

  // 失败响应就抛出错误，优先用后端给的 error 字段。
  throw new Error(payload?.error || defaultError);
}

// =========================
// CHAT - CONVERSATIONS
// =========================

// 读取当前用户的会话列表。
export async function fetchChatConversations(currentUser) {
  // 没有登录用户时，直接返回空列表，避免前端报错。
  if (!currentUser?.id) {
    return { conversations: [] };
  }

  // 发请求到后端的 /api/chats。
  const response = await fetch("/api/chats", {
    // 把当前用户身份信息放进请求头。
    headers: buildApiHeaders(currentUser),
    // 不要用缓存，聊天列表需要尽量拿到最新数据。
    cache: "no-store",
  });

  // 交给统一的 response 处理函数。
  return handleResponse(response, "Unable to load conversations.");
}

// 创建会话；如果不存在就让后端创建一个。
export async function ensureConversationExists(currentUser, otherUserId) {
  // 没登录就不能创建会话。
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }

  // 对方用户 ID 必须是合法正整数。
  if (!Number.isInteger(Number(otherUserId)) || Number(otherUserId) <= 0) {
    throw new Error("Invalid user id");
  }

  // POST /api/chats/conversations
  const response = await fetch("/api/chats/conversations", {
    method: "POST",
    // 请求头里带上当前用户身份，以及 JSON 内容类型。
    headers: buildApiHeaders(currentUser, {
      "Content-Type": "application/json",
    }),
    // 请求体里传对方用户 ID。
    body: JSON.stringify({ other_user_id: Number(otherUserId) }),
  });

  // 统一处理响应。
  return handleResponse(response, "Unable to open conversation.");
}

// 把某个会话标记为已读。
export async function markConversationAsRead(currentUser, conversationId) {
  // 没登录就不允许操作。
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }

  // POST /api/chats/:conversationId/read
  const response = await fetch(`/api/chats/${conversationId}/read`, {
    method: "POST",
    headers: buildApiHeaders(currentUser, {
      "Content-Type": "application/json",
    }),
  });

  // 成功就返回结果，失败就抛错。
  return handleResponse(response, "Unable to mark conversation as read.");
}

// 删除整个会话。
export async function deleteChatConversation(currentUser, conversationId) {
  // 没登录就不能删。
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }

  // DELETE /api/chats/:conversationId
  const response = await fetch(`/api/chats/${conversationId}`, {
    method: "DELETE",
    headers: buildApiHeaders(currentUser),
  });

  // 如果后端说找不到这个会话，也把它当成前端删除成功。
  // 这样可以避免“已经删过了”还让前端报错。
  if (response.status === 404) {
    return { success: true, conversation_id: conversationId };
  }

  // 其他情况统一处理。
  return handleResponse(response, "Unable to delete conversation.");
}

// =========================
// CHAT - MESSAGES
// =========================

// 读取某个会话的消息列表。
export async function fetchConversationMessages(
  currentUser,
  conversationId,
  options = {},
) {
  // 没登录就不能查消息。
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }

  // 从 options 里取分页参数。
  const limit = Number(options.limit);
  const offset = Number(options.offset);

  // 组装 query string。
  const params = new URLSearchParams();

  // limit 合法才放进去。
  if (Number.isInteger(limit) && limit > 0) {
    params.set("limit", String(limit));
  }

  // offset 合法才放进去。
  if (Number.isInteger(offset) && offset >= 0) {
    params.set("offset", String(offset));
  }

  // 如果有 query 参数，就拼到 URL 后面。
  const query = params.toString();
  const endpoint = query
    ? `/api/chats/${conversationId}/messages?${query}`
    : `/api/chats/${conversationId}/messages`;

  // 发 GET 请求读取消息。
  const response = await fetch(endpoint, {
    headers: buildApiHeaders(currentUser),
    cache: "no-store",
  });

  // 统一处理响应。
  return handleResponse(response, "Unable to load conversation.");
}

// 发送一条消息。
export async function sendChatMessage(currentUser, recipientUserId, content) {
  // 没登录就不能发消息。
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }

  // POST /api/chats/messages
  const response = await fetch("/api/chats/messages", {
    method: "POST",
    headers: buildApiHeaders(currentUser, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ recipient_user_id: recipientUserId, content }),
  });

  // 返回后端处理结果。
  return handleResponse(response, "Unable to send message.");
}

// 删除单条消息。
export async function deleteChatMessage(currentUser, conversationId, messageId) {
  // 没登录就不能删消息。
  if (!currentUser?.id) {
    throw new Error("Not authenticated");
  }

  // DELETE /api/chats/:conversationId/messages/:messageId
  const response = await fetch(`/api/chats/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
    headers: buildApiHeaders(currentUser),
  });

  // 统一处理响应。
  return handleResponse(response, "Unable to delete message.");
}
