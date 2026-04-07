const pool = require("../db");
const { getIO, REALTIME_EVENTS } = require("../realtime");

async function createNotification({
  userId,
  actorUserId = null,
  type,
  message,
  metadata = {},
}) {
  if (!userId || !type || !message) {
    return;
  }

  // Do not notify users about their own actions.
  if (actorUserId && String(userId) === String(actorUserId)) {
    return;
  }

  if (actorUserId) {
    try {
      const blockedResult = await pool.query(
        `
        SELECT 1
        FROM user_blocks
        WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
           OR (blocker_user_id = $2 AND blocked_user_id = $1)
        LIMIT 1
        `,
        [userId, actorUserId],
      );

      if (blockedResult.rowCount > 0) {
        return;
      }
    } catch (error) {
      if (!(error && error.code === "42P01")) {
        throw error;
      }
    }
  }

  try {
    const insertResult = await pool.query(
      `
      INSERT INTO notifications (user_id, actor_user_id, type, message, metadata)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING
        id,
        user_id,
        actor_user_id,
        type,
        message,
        metadata,
        is_read,
        created_at,
        (
          SELECT u.username
          FROM users u
          WHERE u.id = notifications.actor_user_id
          LIMIT 1
        ) AS actor_username
      `,
      [userId, actorUserId, type, message, JSON.stringify(metadata || {})],
    );

    const io = getIO();
    if (io && insertResult.rowCount > 0) {
      io.to(`user:${userId}`).emit(REALTIME_EVENTS.NOTIFICATION_CREATED, {
        notification: insertResult.rows[0],
      });
    }
  } catch (error) {
    // Keep social actions working even if notifications table has not been migrated yet.
    if (error && error.code === "42P01") {
      return;
    }
    throw error;
  }
}

module.exports = {
  createNotification,
};
