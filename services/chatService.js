const pool = require("../db");

class ChatService {
  async getConversationParticipants(conversationId) {
    const result = await pool.query(
      `SELECT user_a_id, user_b_id FROM chat_conversations WHERE id = $1 LIMIT 1`,
      [conversationId]
    );
    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async markConversationDeleted(userId, conversationId) {
    await pool.query("BEGIN");
    try {
      await pool.query(
        `
        INSERT INTO chat_deleted_conversations (user_id, conversation_id, deleted_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, conversation_id)
        DO UPDATE SET deleted_at = EXCLUDED.deleted_at
        `,
        [userId, conversationId]
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
        [userId, conversationId]
      );
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }

  async getConversationsList(userId) {
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
          AND NOT EXISTS (
            SELECT 1
            FROM chat_deleted_conversations cdc
            WHERE cdc.user_id = $1
              AND cdc.conversation_id = c.id
          )
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
          WHERE ub.blocker_user_id = $1
            AND ub.blocked_user_id = uc.other_user_id
        ) AS blocked_by_you,
        EXISTS (
          SELECT 1 FROM user_blocks ub
          WHERE ub.blocker_user_id = uc.other_user_id
            AND ub.blocked_user_id = $1
        ) AS blocked_you
      FROM user_conversations uc
      JOIN chat_conversations c ON c.id = uc.conversation_id
      JOIN users u ON u.id = uc.other_user_id
      LEFT JOIN LATERAL (
        SELECT cm.sender_user_id, cm.content, cm.created_at
        FROM chat_messages cm
        WHERE cm.conversation_id = uc.conversation_id
          AND NOT EXISTS (
            SELECT 1
            FROM chat_deleted_messages cdm
            WHERE cdm.user_id = $1
              AND cdm.message_id = cm.id
          )
        ORDER BY cm.created_at DESC, cm.id DESC
        LIMIT 1
      ) lm ON TRUE
      LEFT JOIN (
        SELECT conversation_id, COUNT(*) AS unread_count
        FROM chat_messages
        WHERE recipient_user_id = $1 AND NOT is_read
          AND NOT EXISTS (
            SELECT 1
            FROM chat_deleted_messages cdm
            WHERE cdm.user_id = $1
              AND cdm.message_id = chat_messages.id
          )
        GROUP BY conversation_id
      ) unread_counts ON unread_counts.conversation_id = uc.conversation_id
      ORDER BY c.last_message_at DESC NULLS LAST, uc.conversation_id ASC
    `;
    const result = await pool.query(sql, [userId]);
    return result.rows;
  }

  async findOrCreateConversation(userA, userB) {
    const result = await pool.query(
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
      [Math.min(userA, userB), Math.max(userA, userB)]
    );
    return result.rows[0]?.id;
  }

  async checkMessageExistsAndValid(messageId, conversationId) {
    const messageResult = await pool.query(
      `
      SELECT id, conversation_id, sender_user_id, recipient_user_id, content, created_at, is_read
      FROM chat_messages
      WHERE id = $1
        AND conversation_id = $2
      LIMIT 1
      `,
      [messageId, conversationId]
    );
    return messageResult.rowCount > 0;
  }

  async deleteMessage(userId, messageId, conversationId) {
    await pool.query(
      `
      INSERT INTO chat_deleted_messages (user_id, message_id, conversation_id, deleted_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, message_id)
      DO UPDATE SET deleted_at = EXCLUDED.deleted_at
      `,
      [userId, messageId, conversationId]
    );
  }

  async checkConversationValidAndUndeleted(userId, conversationId) {
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
        AND NOT EXISTS (
          SELECT 1
          FROM chat_deleted_conversations cdc
          WHERE cdc.user_id = $1
            AND cdc.conversation_id = chat_conversations.id
        )
      LIMIT 1
      `,
      [userId, conversationId]
    );
    return conversationResult.rowCount > 0 ? conversationResult.rows[0] : null;
  }

  async getOtherUserDetails(otherUserId) {
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
      [otherUserId]
    );
    return otherUserResult.rowCount > 0 ? otherUserResult.rows[0] : null;
  }

  async markMessagesAsRead(userId, conversationId) {
    const updateResult = await pool.query(
      `
      UPDATE chat_messages
      SET is_read = TRUE
      WHERE conversation_id = $1
        AND recipient_user_id = $2
        AND NOT is_read
        AND NOT EXISTS (
          SELECT 1
          FROM chat_deleted_messages cdm
          WHERE cdm.user_id = $2
            AND cdm.message_id = chat_messages.id
        )
      `,
      [conversationId, userId]
    );
    return updateResult.rowCount || 0;
  }

  async markSingleMessageAsReadAndReturn(messageId) {
     const readResult = await pool.query(
        `
        UPDATE chat_messages
        SET is_read = TRUE
        WHERE id = $1
        RETURNING id, conversation_id, sender_user_id, recipient_user_id, content, created_at, is_read
        `,
        [messageId]
      );
      return readResult.rows[0];
  }

  async getMessages(userId, conversationId, limit, offset) {
    const historyResult = await pool.query(
      `
      SELECT id, sender_user_id, recipient_user_id, content, created_at, is_read
      FROM chat_messages
      WHERE conversation_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM chat_deleted_messages cdm
          WHERE cdm.user_id = $4
            AND cdm.message_id = chat_messages.id
        )
      ORDER BY created_at DESC, id DESC
      LIMIT $2
      OFFSET $3
      `,
      [conversationId, limit + 1, offset, userId]
    );
    return historyResult.rows;
  }

  async checkUserExists(userId) {
     const result = await pool.query(`SELECT 1 FROM users WHERE id = $1 LIMIT 1`, [userId]);
     return result.rowCount > 0;
  }

  async insertMessageAndUpdateLastMessageAt(senderId, recipientId, content) {
    const userA = Math.min(senderId, recipientId);
    const userB = Math.max(senderId, recipientId);

    const conversationResult = await pool.query(
      `
      INSERT INTO chat_conversations (user_a_id, user_b_id, last_message_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_a_id, user_b_id)
      DO UPDATE SET last_message_at = NOW()
      RETURNING id
      `,
      [userA, userB]
    );

    const conversationId = conversationResult.rows[0].id;

    await pool.query(
      `
      DELETE FROM chat_deleted_conversations
      WHERE conversation_id = $1
        AND user_id IN ($2, $3)
      `,
      [conversationId, senderId, recipientId]
    );

    const insertResult = await pool.query(
      `
      INSERT INTO chat_messages (conversation_id, sender_user_id, recipient_user_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id, conversation_id, sender_user_id, recipient_user_id, content, created_at, is_read
      `,
      [conversationId, senderId, recipientId, content]
    );

    return {
      conversationId,
      message: insertResult.rows[0]
    };
  }
  async fetchConnectionStatus(userA, userB) {
    const result = await pool.query(
      `
      SELECT
        EXISTS(SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2) AS liked_a,
        EXISTS(SELECT 1 FROM likes WHERE liker_user_id = $2 AND liked_user_id = $1) AS liked_b,
        EXISTS(SELECT 1 FROM user_blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2) AS blocked_by_a,
        EXISTS(SELECT 1 FROM user_blocks WHERE blocker_user_id = $2 AND blocked_user_id = $1) AS blocked_by_b
      `,
      [userA, userB]
    );

    const row = result.rows[0];
    if (!row) {
      return { is_match: false, is_blocked: false, blocked_by_you: false, blocked_you: false };
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
}

module.exports = new ChatService();
