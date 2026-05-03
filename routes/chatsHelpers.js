const pool = require("../db");
const { getIO, REALTIME_EVENTS } = require("../realtime");

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

async function deleteConversationHandler(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    const conversationId = parsePositiveInt(req.params.conversationId);
    if (!currentUserId || !conversationId) {
      return res
        .status(400)
        .json({ error: "x-user-id header et conversation id requis" });
    }

    const convResult = await pool.query(
      `SELECT user_a_id, user_b_id FROM chat_conversations WHERE id = $1 LIMIT 1`,
      [conversationId],
    );
    if (convResult.rowCount === 0) {
      return res.status(404).json({ error: "Conversation introuvable" });
    }
    const { user_a_id, user_b_id } = convResult.rows[0];
    if (
      Number(currentUserId) !== Number(user_a_id) &&
      Number(currentUserId) !== Number(user_b_id)
    ) {
      return res
        .status(403)
        .json({ error: "Accès refusé à cette conversation" });
    }

    await pool.query("BEGIN");
    await pool.query(
      `
      INSERT INTO chat_deleted_conversations (user_id, conversation_id, deleted_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, conversation_id)
      DO UPDATE SET deleted_at = EXCLUDED.deleted_at
      `,
      [currentUserId, conversationId],
    );
    await pool.query(
      `
      INSERT INTO chat_deleted_messages (user_id, message_id, conversation_id, deleted_at)
      SELECT $1, m.id, m.conversation_id, NOW()
      FROM chat_messages m
      WHERE m.conversation_id = $2
      ON CONFLICT (user_id, message_id)
      DO UPDATE SET deleted_at = EXCLUDED.deleted_at
      `,
      [currentUserId, conversationId],
    );
    await pool.query("COMMIT");

    const io = getIO();
    if (io) {
      io.to(`user:${currentUserId}`).emit(
        REALTIME_EVENTS.CHAT_CONVERSATION_DELETED,
        { conversation_id: conversationId, user_id: currentUserId },
      );
    }

    return res.json({ success: true, conversation_id: conversationId });
  } catch (error) {
    try {
      await pool.query("ROLLBACK");
    } catch {
      // no-op
    }
    return next(error);
  }
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

async function fetchConnectionStatus(userA, userB) {
  const result = await pool.query(
    `
    SELECT
      EXISTS(
        SELECT 1
        FROM likes
        WHERE liker_user_id = $1 AND liked_user_id = $2
      ) AS liked_a,
      EXISTS(
        SELECT 1
        FROM likes
        WHERE liker_user_id = $2 AND liked_user_id = $1
      ) AS liked_b,
      EXISTS(
        SELECT 1
        FROM user_blocks
        WHERE blocker_user_id = $1 AND blocked_user_id = $2
      ) AS blocked_by_a,
      EXISTS(
        SELECT 1
        FROM user_blocks
        WHERE blocker_user_id = $2 AND blocked_user_id = $1
      ) AS blocked_by_b
    `,
    [userA, userB],
  );

  const row = result.rows[0];
  if (!row) {
    return {
      is_match: false,
      is_blocked: false,
      blocked_by_you: false,
      blocked_you: false,
    };
  }

  const blockedByYou = Boolean(row.blocked_by_a);
  const blockedYou = Boolean(row.blocked_by_b);

  return {
    is_match: Boolean(row.liked_a && row.liked_b),
    is_blocked: blockedByYou || blockedYou,
    blocked_by_you: blockedByYou,
    blocked_you: blockedYou,
  };
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

module.exports = {
  MAX_CHAT_MESSAGE_LENGTH,
  parseQuotedReplyText,
  getMessageLengthForLimit,
  deleteConversationHandler,
  getConversationRoomName,
  isUserActiveInConversation,
  parsePositiveInt,
  parseNonNegativeInt,
  fetchConnectionStatus,
  ensureConnectionAllowed,
  ensureMatchRequired,
};