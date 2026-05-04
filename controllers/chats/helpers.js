const { getIO, REALTIME_EVENTS } = require("../../realtime");
const chatService = require("../../services/chatService");

const MAX_CHAT_MESSAGE_LENGTH = 1200;

function parseQuotedReplyText(content) {
  const text = String(content || "");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (!lines.length) return null;

  const headerMatch = lines[0].match(/^(.*) wrote:\s*$/i);
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

function getMessageLengthForLimit(content) {
  const parsedReply = parseQuotedReplyText(content);
  if (parsedReply !== null) {
    return parsedReply.length;
  }
  return String(content || "").trim().length;
}

function getConversationRoomName(conversationId) {
  return `conversation:${conversationId}`;
}

function isUserActiveInConversation(io, conversationId, userId) {
  if (!io) return false;

  const room = io.sockets.adapter.rooms.get(
    getConversationRoomName(conversationId),
  );
  if (!room || room.size === 0) return false;

  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket && Number(socket.data?.userId) === Number(userId)) {
      return true;
    }
  }

  return false;
}

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

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
