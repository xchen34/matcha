const { getIO, REALTIME_EVENTS } = require("../../realtime");
const chatService = require("../../services/chatService");

const MAX_CHAT_MESSAGE_LENGTH = 500;

// 从引用消息内容里提取“真正要限制长度的正文部分”。
// 引用文本（> ...）和元信息（Replying to ...）不应该算进用户消息长度限制里。
function parseQuotedReplyText(content) {
  const text = String(content || "");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (!lines.length) return null;

  const headerMatch = lines[0].match(/^(.*) wrote:\s*$/i) || lines[0].startsWith('Replying to message #');
  if (!headerMatch) return null;

  let index = 1;
  while (index < lines.length) {
    if (!/^>\s?/.test(lines[index])) break;
    index += 1;
  }

  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }

  return lines.slice(index).join("\n").trim();
}

// 计算消息长度时，优先取“真正正文长度”，避免引用块导致长度判断失真。
function getMessageLengthForLimit(content) {
  const parsedReply = parseQuotedReplyText(content);
  if (parsedReply !== null) {
    return parsedReply.length;
  }
  return String(content || "").trim().length;
}

// 把会话房间名统一成固定格式，方便前端/后端都用同一个命名。
function getConversationRoomName(conversationId) {
  return `conversation:${conversationId}`;
}

// 检查某个用户是否真的还在指定会话房间里在线活动。
// 用于判断“发消息时对方是否正在这个聊天页上”，从而决定是否直接标记已读。
function isUserActiveInConversation(io, conversationId, userId) {
  // 没有 io 实例就没法检查房间信息，直接认为不活跃。
  if (!io) return false;

  // 先拿到这个会话房间里的所有 socket 连接。
  const room = io.sockets.adapter.rooms.get(
    getConversationRoomName(conversationId),
  );

  // 房间不存在或者房间里没人，就说明这个会话当前没人在线活动。
  if (!room || room.size === 0) return false;

  // 一个用户可能开了多个 tab，所以同一个 userId 可能对应多个 socket。
  // 这里要逐个检查房间里的 socket，看看有没有属于这个 userId 的连接。
  for (const socketId of room) {
    // 从 socketId 取回真正的 socket 对象。
    const socket = io.sockets.sockets.get(socketId);

    // 如果这个 socket 的 userId 和目标 userId 一致，就说明这个用户正在这个会话里。
    if (socket && Number(socket.data?.userId) === Number(userId)) {
      return true;
    }
  }

  // 房间里没有找到这个用户的活动 socket。
  return false;
}

// 把任意输入安全地转成正整数；不合法就返回 null。
function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

// 把任意输入安全地转成非负整数；不合法就返回 fallback。
function parseNonNegativeInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  
  return parsed;
}

// 只要双方关系里存在拉黑，就不允许继续交互。
function ensureConnectionAllowed(status) {
  if (status.is_blocked) {
    const err = new Error(
      status.blocked_by_you
        ? "Cannot interact with a user you blocked."
        : "You've been blocked",
    );
    err.status = 403;
    throw err;
  }
}

// 发送消息时要求：既不能被拉黑，也必须已经匹配。
function ensureMatchRequired(status) {
  if (status.is_blocked) {
    const err = new Error(
      status.blocked_by_you
        ? "Cannot interact with a user you blocked."
        : "You've been blocked",
    );
    err.status = 403;
    throw err;
  }
  if (!status.is_match) {
    const err = new Error("You must be matched to send messages.");
    err.status = 403;
    throw err;
  }
}

// 从 chatService 转发 connection status 查询，统一放在 helper 里给控制器复用。
async function fetchConnectionStatus(userA, userB) {
  return chatService.fetchConnectionStatus(userA, userB);
}

module.exports = {
  MAX_CHAT_MESSAGE_LENGTH,
  parseQuotedReplyText,
  getMessageLengthForLimit,
  getConversationRoomName,
  isUserActiveInConversation,
  parsePositiveInt,
  parseNonNegativeInt,
  ensureConnectionAllowed,
  ensureMatchRequired,
  fetchConnectionStatus,
};
