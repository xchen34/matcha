const pool = require("../db");

// ChatService = 聊天模块的数据访问层（DAO）。
// 职责：只和数据库打交道，不处理 HTTP request/response。
class ChatService {
  /*  ========== Helpers  ========== */
  // 检查用户是否存在（用于入参校验、防止无效 userId）。
  async checkUserExists(userId) {
    const result = await pool.query(
      `SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [userId],
    );

    return result.rowCount > 0;
  }

  // 检查某条消息是否存在，并且确实属于指定会话。
  async checkMessageExistsAndValid(messageId, conversationId) {
    const messageResult = await pool.query(
      `
      SELECT id, conversation_id, sender_user_id, recipient_user_id, content, created_at, is_read
      FROM chat_messages
      WHERE id = $1
        AND conversation_id = $2
      LIMIT 1
      `,
      [messageId, conversationId],
    );

    return messageResult.rowCount > 0;
  }

  // 校验会话是否对当前用户可见：
  // 1) 用户确实是会话参与者；
  // 2) 该会话没有被该用户“软删除”。
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
      [userId, conversationId],
    );

    return conversationResult.rowCount > 0 ? conversationResult.rows[0] : null;
  }

  /*  ========== Conversations  ========== */
  // 获取会话双方参与者 ID（A/B）。
  async getConversationParticipants(conversationId) {
    const result = await pool.query(
      `SELECT user_a_id, user_b_id FROM chat_conversations WHERE id = $1 LIMIT 1`,
      [conversationId],
    );

    return result.rowCount > 0 ? result.rows[0] : null;
  }

  // 按用户对“查找或创建”会话。
  // 关键点：先把 userId 归一化成 (较小ID, 较大ID)，避免 (1,2)/(2,1) 两条会话。
  async findOrCreateConversation(userA, userB) {
    const normalizedA = Math.min(userA, userB);
    const normalizedB = Math.max(userA, userB);
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
      [normalizedA, normalizedB],
    );
    const conversationId = result.rows[0]?.id;
    if (!conversationId) {
      return null;
    }

    // 重新发起对话时，把双方的“会话已删除标记”清掉，让会话重新可见。
    await pool.query(
      `
      DELETE FROM chat_deleted_conversations
      WHERE conversation_id = $1
        AND user_id IN ($2, $3)
      `,
      [conversationId, normalizedA, normalizedB],
    );

    return conversationId;
  }

  // 删除会话（软删除）：
  // - 仅对当前用户生效，不会真正删掉会话和消息实体。
  // - 同时把该会话下每条消息标记为“该用户已删除”。
  // - 使用事务确保两张删除标记表一致。
  //EXCLUDED 是 PostgreSQL 的 UPSERT 语法，表示“如果冲突了就用这个值更新”，这里的意思是“如果之前已经有删除标记了，就更新 deleted_at 字段为最新的时间”。
  // m 是 chat_messages 表的别名，cdm 是 chat_deleted_messages 表的别名，这个子查询的意思是“对于 chat_messages 表中的每条消息，检查 chat_deleted_messages 表中是否存在该用户已经删除了这条消息的记录，如果存在则不返回这条消息”，从而实现了“当前用户已删除的消息不显示”的效果。
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
        [userId, conversationId],
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
        [userId, conversationId],
      );
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }

  /*  ========== Messages  ========== */
  // 插入消息并刷新会话 last_message_at。
  // 若会话不存在则自动创建（同一用户对只会保留一条会话）。
  //onconflitt 是 PostgreSQL 的 UPSERT 语法，表示“如果冲突了就用这个值更新”，这里的意思是“如果之前已经有这条会话了，就更新 last_message_at 字段为最新的时间”，从而实现了“每发一条消息就把会话的 last_message_at 刷新”的效果。
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
      [userA, userB],
    );

    const conversationId = conversationResult.rows[0].id;

    // 发新消息后，清理双方的“会话已删除标记”，确保会话重新出现在列表里。
    await pool.query(
      `
      DELETE FROM chat_deleted_conversations
      WHERE conversation_id = $1
        AND user_id IN ($2, $3)
      `,
      [conversationId, senderId, recipientId],
    );

    const insertResult = await pool.query(
      `
      INSERT INTO chat_messages (conversation_id, sender_user_id, recipient_user_id, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id, conversation_id, sender_user_id, recipient_user_id, content, created_at, is_read
      `,
      [conversationId, senderId, recipientId, content],
    );

    return {
      conversationId,
      message: insertResult.rows[0],
    };
  }

  // 分页读取会话消息（倒序），并过滤“当前用户已删除”的消息。
  // 调用方常用 limit+1 判断是否还有下一页。具体就是“请求 limit+1 条，如果返回的消息数量超过 limit，就说明还有下一页；如果返回的消息数量不超过 limit，就说明没有下一页了”。
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
      [conversationId, limit + 1, offset, userId],
    );

    return historyResult.rows; 
  }

  // 删除单条消息（软删除，仅对当前用户隐藏）。
  async deleteMessage(userId, messageId, conversationId) {
    await pool.query(
      `
      INSERT INTO chat_deleted_messages (user_id, message_id, conversation_id, deleted_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, message_id)
      DO UPDATE SET deleted_at = EXCLUDED.deleted_at
      `,
      [userId, messageId, conversationId],
    );
  }

  // 把“发给当前用户”的未读消息批量改为已读（仅限当前会话）。
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
      [conversationId, userId],
    );

    return updateResult.rowCount || 0;
  }

  // 仅将一条消息置为已读并返回该消息（用于精细化读状态更新）。
  async markSingleMessageAsReadAndReturn(messageId) {
    const readResult = await pool.query(
      `
        UPDATE chat_messages
        SET is_read = TRUE
        WHERE id = $1
        RETURNING id, conversation_id, sender_user_id, recipient_user_id, content, created_at, is_read
        `,
      [messageId],
    );

    return readResult.rows[0];
  }

  /*  ========== Other User Details for Conversations List  ========== */
  // 获取会话另一方的展示信息（用户名、姓名、主图），用于会话列表卡片。
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
          AND deleted_at IS NULL
        LIMIT 1
        `,
        [otherUserId],
      );
      return otherUserResult.rowCount > 0 ? otherUserResult.rows[0] : null;
    }
    
  /*  ========== Conversations List  ========== */
  // 获取“当前用户会话列表”聚合视图：
  // - 另一方用户信息
  // - 最后一条消息
  // - 未读数
  // - 匹配/拉黑状态
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
        u.id IS NULL AS other_user_deleted,
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
      LEFT JOIN users u ON u.id = uc.other_user_id AND u.deleted_at IS NULL
      LEFT JOIN LATERAL (
        -- 对每个会话取“当前用户可见”的最后一条消息。
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
        -- 统计每个会话里“发给我且未读且未被我删除”的消息数量。
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

  /*  ========== Connection Status  ========== */
  // 查询两用户关系状态（互赞=match、是否互相拉黑、匹配时间）。
  // 返回给上层用于决定：能否发消息、前端显示何种状态徽章。
  async fetchConnectionStatus(userA, userB) {
    const result = await pool.query(
      `
      SELECT
        EXISTS(SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2) AS liked_a,
        EXISTS(SELECT 1 FROM likes WHERE liker_user_id = $2 AND liked_user_id = $1) AS liked_b,
        EXISTS(SELECT 1 FROM user_blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2) AS blocked_by_a,
        EXISTS(SELECT 1 FROM user_blocks WHERE blocker_user_id = $2 AND blocked_user_id = $1) AS blocked_by_b,
        CASE 
          WHEN EXISTS(SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2) 
            AND EXISTS(SELECT 1 FROM likes WHERE liker_user_id = $2 AND liked_user_id = $1)
          THEN GREATEST(
            (SELECT created_at FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2),
            (SELECT created_at FROM likes WHERE liker_user_id = $2 AND liked_user_id = $1)
          )
          ELSE NULL
        END AS match_created_at
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
        match_created_at: null,
      };
    }

    const blockedByYou = Boolean(row.blocked_by_a);
    const blockedYou = Boolean(row.blocked_by_b);

    return {
      is_match: Boolean(row.liked_a && row.liked_b),
      is_blocked: blockedByYou || blockedYou,
      blocked_by_you: blockedByYou,
      blocked_you: blockedYou,
      match_created_at: row.match_created_at,
    };
  }
}

module.exports = new ChatService();
