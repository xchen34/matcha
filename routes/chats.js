const express = require("express");
const pool = require("../db");
const { getIO, REALTIME_EVENTS } = require("../realtime");
const { isUserOnline } = require("../realtime/presence");

const router = express.Router();
router.delete("/:conversationId", async (req, res, next) => {
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

    await pool.query(`DELETE FROM chat_messages WHERE conversation_id = $1`, [
      conversationId,
    ]);
    await pool.query(`DELETE FROM chat_conversations WHERE id = $1`, [
      conversationId,
    ]);

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

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
        WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
           OR (blocker_user_id = $2 AND blocked_user_id = $1)
      ) AS blocked
    `,
    [userA, userB],
  );

  const row = result.rows[0];
  if (!row) {
    return { is_match: false, is_blocked: false };
  }

  return {
    is_match: Boolean(row.liked_a && row.liked_b),
    is_blocked: Boolean(row.blocked),
  };
}

function ensureConnectionAllowed(status) {
  if (status.is_blocked) {
    const err = new Error("Chat is blocked between these users");
    err.status = 403;
    throw err;
  }
}

function ensureMatchRequired(status) {
  if (status.is_blocked) {
    const err = new Error("Chat is blocked between these users.");
    err.status = 403;
    throw err;
  }
  if (!status.is_match) {
    const err = new Error("You must be matched to send messages.");
    err.status = 403;
    throw err;
  }
}

router.get("/chats", async (req, res, next) => {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    if (!currentUserId) {
      return res.status(400).json({ error: "x-user-id header is required" });
    }

    const sql = `
      WITH user_conversations AS (
        SELECT
          c.id AS conversation_id,
          c.user_a_id,
          c.user_b_id,
          c.last_message_at,
          CASE
            WHEN c.user_a_id = $1 THEN c.user_b_id
            ELSE c.user_a_id
          END AS other_user_id
        FROM chat_conversations c
        WHERE $1 IN (c.user_a_id, c.user_b_id)
      )
      SELECT
        uc.conversation_id,
        uc.other_user_id,
        u.username AS other_username,
        u.first_name,
        u.last_name,
        (
          SELECT up.data_url
          FROM user_photos up
          WHERE up.user_id = u.id
          ORDER BY up.is_primary DESC, up.id ASC
          LIMIT 1
        ) AS other_primary_photo_url,
        lm.sender_user_id AS last_message_sender_id,
        lm.content AS last_message_content,
        lm.created_at AS last_message_created_at,
        COALESCE(unread_counts.unread_count, 0) AS unread_count,
        EXISTS (
          SELECT 1 FROM likes l1 WHERE l1.liker_user_id = $1 AND l1.liked_user_id = uc.other_user_id
        ) AND EXISTS (
          SELECT 1 FROM likes l2 WHERE l2.liker_user_id = uc.other_user_id AND l2.liked_user_id = $1
        ) AS is_match,
        EXISTS (
          SELECT 1 FROM user_blocks ub
          WHERE (ub.blocker_user_id = $1 AND ub.blocked_user_id = uc.other_user_id)
             OR (ub.blocker_user_id = uc.other_user_id AND ub.blocked_user_id = $1)
        ) AS is_blocked
      FROM user_conversations uc
      JOIN chat_conversations c ON c.id = uc.conversation_id
      JOIN users u ON u.id = uc.other_user_id
      LEFT JOIN LATERAL (
        SELECT cm.sender_user_id, cm.content, cm.created_at
        FROM chat_messages cm
        WHERE cm.conversation_id = uc.conversation_id
        ORDER BY cm.created_at DESC, cm.id DESC
        LIMIT 1
      ) lm ON TRUE
      LEFT JOIN (
        SELECT conversation_id, COUNT(*) AS unread_count
        FROM chat_messages
        WHERE recipient_user_id = $1 AND NOT is_read
        GROUP BY conversation_id
      ) unread_counts ON unread_counts.conversation_id = uc.conversation_id
      ORDER BY c.last_message_at DESC NULLS LAST, uc.conversation_id ASC
    `;

    const result = await pool.query(sql, [currentUserId]);

    const conversations = result.rows
      .filter((row) => !row.is_blocked)
      .map((row) => ({
        conversation_id: row.conversation_id,
        other_user: {
          id: row.other_user_id,
          username: row.other_username,
          first_name: row.first_name || "",
          last_name: row.last_name || "",
          is_online: isUserOnline(row.other_user_id),
          primary_photo_url: row.other_primary_photo_url || "",
        },
        last_message: row.last_message_content
          ? {
              sender_user_id: row.last_message_sender_id,
              content: row.last_message_content,
              created_at: row.last_message_created_at,
            }
          : null,
        unread_count: Number(row.unread_count ?? 0),
        is_match: !!row.is_match,
      }));

    return res.json({ conversations });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ conversations: [] });
    }
    return next(error);
  }
});

router.get("/chats/:conversationId/messages", async (req, res, next) => {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    const conversationId = parsePositiveInt(req.params.conversationId);
    const limit = Math.min(
      100,
      Math.max(1, parseNonNegativeInt(req.query.limit, 20) || 20),
    );
    const offset = parseNonNegativeInt(req.query.offset, 0);
    if (!currentUserId || !conversationId) {
      return res
        .status(400)
        .json({ error: "x-user-id header and conversation id are required" });
    }

    const conversationResult = await pool.query(
      `
      SELECT id, user_a_id, user_b_id,
        CASE
          WHEN user_a_id = $1 THEN user_b_id
          ELSE user_a_id
        END AS other_user_id
      FROM chat_conversations
      WHERE id = $2
        AND $1 IN (user_a_id, user_b_id)
      LIMIT 1
      `,
      [currentUserId, conversationId],
    );

    if (conversationResult.rowCount === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const conversationRow = conversationResult.rows[0];
    const otherUserId = conversationRow.other_user_id;
    const status = await fetchConnectionStatus(currentUserId, otherUserId);
    ensureConnectionAllowed(status);

    const otherUserResult = await pool.query(
      `
      SELECT
        id,
        username,
        first_name,
        last_name,
        (
          SELECT up.data_url
          FROM user_photos up
          WHERE up.user_id = users.id
          ORDER BY up.is_primary DESC, up.id ASC
          LIMIT 1
        ) AS primary_photo_url
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [otherUserId],
    );

    await pool.query(
      `
      UPDATE chat_messages
      SET is_read = TRUE
      WHERE conversation_id = $1
        AND recipient_user_id = $2
        AND NOT is_read
      `,
      [conversationId, currentUserId],
    );

    const historyResult = await pool.query(
      `
      SELECT id, sender_user_id, recipient_user_id, content, created_at, is_read
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
      OFFSET $3
      `,
      [conversationId, limit + 1, offset],
    );

    const hasMore = historyResult.rows.length > limit;
    const pagedRows = hasMore
      ? historyResult.rows.slice(0, limit)
      : historyResult.rows;
    const messages = pagedRows.reverse();

    return res.json({
      conversation: {
        id: conversationId,
        other_user: {
          id: otherUserResult.rows[0]?.id || otherUserId,
          username: otherUserResult.rows[0]?.username || "Unknown user",
          first_name: otherUserResult.rows[0]?.first_name || "",
          last_name: otherUserResult.rows[0]?.last_name || "",
          primary_photo_url: otherUserResult.rows[0]?.primary_photo_url || "",
          is_online: isUserOnline(otherUserId),
        },
        is_match: !!status.is_match,
      },
      messages,
      paging: {
        limit,
        offset,
        has_more: hasMore,
      },
    });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ conversation: null, messages: [] });
    }
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
});

router.post("/chats/:conversationId/read", async (req, res, next) => {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    const conversationId = parsePositiveInt(req.params.conversationId);
    if (!currentUserId || !conversationId) {
      return res
        .status(400)
        .json({ error: "x-user-id header and conversation id are required" });
    }

    const conversationResult = await pool.query(
      `
      SELECT id
      FROM chat_conversations
      WHERE id = $1
        AND $2 IN (user_a_id, user_b_id)
      LIMIT 1
      `,
      [conversationId, currentUserId],
    );

    if (conversationResult.rowCount === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const updateResult = await pool.query(
      `
      UPDATE chat_messages
      SET is_read = TRUE
      WHERE conversation_id = $1
        AND recipient_user_id = $2
        AND NOT is_read
      `,
      [conversationId, currentUserId],
    );

    const io = getIO();
    if (io) {
      io.to(`user:${currentUserId}`).emit(
        REALTIME_EVENTS.CHAT_CONVERSATION_READ,
        {
          conversation_id: conversationId,
          reader_user_id: currentUserId,
          updated_count: updateResult.rowCount || 0,
        },
      );
      const participantResult = await pool.query(
        `
        SELECT
          CASE
            WHEN user_a_id = $1 THEN user_b_id
            ELSE user_a_id
          END AS other_user_id
        FROM chat_conversations
        WHERE id = $2
        LIMIT 1
        `,
        [currentUserId, conversationId],
      );
      const otherUserId = participantResult.rows[0]?.other_user_id;
      if (otherUserId) {
        io.to(`user:${otherUserId}`).emit(
          REALTIME_EVENTS.CHAT_CONVERSATION_READ,
          {
            conversation_id: conversationId,
            reader_user_id: currentUserId,
            updated_count: updateResult.rowCount || 0,
          },
        );
      }
    }

    return res.json({ updated_count: updateResult.rowCount || 0 });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res
        .status(503)
        .json({ error: "Chat feature not available yet (missing schema)" });
    }
    return next(error);
  }
});

router.post("/chats/messages", async (req, res, next) => {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    const recipientUserId = parsePositiveInt(req.body?.recipient_user_id);
    if (!currentUserId || !recipientUserId) {
      return res.status(400).json({
        error: "x-user-id header and recipient_user_id body field are required",
      });
    }

    if (currentUserId === recipientUserId) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    const safeContent = String(req.body?.content || "").trim();
    if (!safeContent) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const truncatedContent = safeContent.slice(0, 1200);

    const recipientResult = await pool.query(
      `
      SELECT 1
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [recipientUserId],
    );
    if (recipientResult.rowCount === 0) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const status = await fetchConnectionStatus(currentUserId, recipientUserId);
    ensureMatchRequired(status);

    const userA = Math.min(currentUserId, recipientUserId);
    const userB = Math.max(currentUserId, recipientUserId);

    const conversationResult = await pool.query(
      `
      INSERT INTO chat_conversations (user_a_id, user_b_id, last_message_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_a_id, user_b_id)
      DO UPDATE SET last_message_at = NOW()
      RETURNING id
      `,
      [userA, userB],
    );

    const conversationId = conversationResult.rows[0].id;

    const insertResult = await pool.query(
      `
      INSERT INTO chat_messages (conversation_id, sender_user_id, recipient_user_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id, conversation_id, sender_user_id, recipient_user_id, content, created_at, is_read
      `,
      [conversationId, currentUserId, recipientUserId, truncatedContent],
    );

    const io = getIO();
    const recipientIsActive = isUserActiveInConversation(
      io,
      conversationId,
      recipientUserId,
    );

    let message = insertResult.rows[0];
    let readEventPayload = null;
    if (recipientIsActive) {
      const readResult = await pool.query(
        `
        UPDATE chat_messages
        SET is_read = TRUE
        WHERE id = $1
        RETURNING id, conversation_id, sender_user_id, recipient_user_id, content, created_at, is_read
        `,
        [message.id],
      );
      message = readResult.rows[0] || message;
      readEventPayload = {
        conversation_id: conversationId,
        reader_user_id: recipientUserId,
        updated_count: 1,
      };
    }

    if (io) {
      const payload = { message };
      io.to(`user:${currentUserId}`).emit(
        REALTIME_EVENTS.CHAT_MESSAGE_CREATED,
        payload,
      );
      io.to(`user:${recipientUserId}`).emit(
        REALTIME_EVENTS.CHAT_MESSAGE_CREATED,
        payload,
      );

      if (readEventPayload) {
        io.to(`user:${currentUserId}`).emit(
          REALTIME_EVENTS.CHAT_CONVERSATION_READ,
          readEventPayload,
        );
        io.to(`user:${recipientUserId}`).emit(
          REALTIME_EVENTS.CHAT_CONVERSATION_READ,
          readEventPayload,
        );
      }
    }

    return res.status(201).json({
      conversation_id: conversationId,
      message,
    });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res
        .status(503)
        .json({ error: "Chat feature not available yet (missing schema)" });
    }
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
});

router.post("/chats/conversations", async (req, res, next) => {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    const otherUserId = parsePositiveInt(req.body?.other_user_id);

    if (!currentUserId || !otherUserId) {
      return res.status(400).json({
        error: "x-user-id header and other_user_id body field are required",
      });
    }

    if (currentUserId === otherUserId) {
      return res.status(400).json({ error: "Cannot open chat with yourself" });
    }

    const status = await fetchConnectionStatus(currentUserId, otherUserId);
    ensureConnectionAllowed(status);

    const userA = Math.min(currentUserId, otherUserId);
    const userB = Math.max(currentUserId, otherUserId);

    const conversationResult = await pool.query(
      `
      WITH inserted AS (
        INSERT INTO chat_conversations (user_a_id, user_b_id)
        VALUES ($1, $2)
        ON CONFLICT (user_a_id, user_b_id) DO NOTHING
        RETURNING id
      )
      SELECT id FROM inserted
      UNION ALL
      SELECT id FROM chat_conversations WHERE user_a_id = $1 AND user_b_id = $2
      LIMIT 1
      `,
      [userA, userB],
    );

    if (conversationResult.rowCount === 0) {
      return res.status(500).json({ error: "Unable to open conversation" });
    }

    return res
      .status(201)
      .json({ conversation_id: conversationResult.rows[0].id });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res
        .status(503)
        .json({ error: "Chat feature not available yet (missing schema)" });
    }
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
});

module.exports = router;
