const pool = require("../db");
const { getIO, REALTIME_EVENTS } = require("../realtime");

/**
 * NotificationService is the data and realtime bridge for notification events.
 *
 * Responsibilities:
 * - persist notifications in the database
 * - avoid creating noise for blocked/self interactions
 * - push realtime notification events to the correct user room
 * - query notifications for the authenticated user's inbox
 * - mark notifications as read
 */
class NotificationService {
  /*  ========== Create Notification  ========== */
  /**
   * Create a notification record and broadcast it to the target user if possible.
   *
   * What it does:
   * - validates the minimum input required to create a useful notification
   * - skips self-notifications so users do not get notified about their own actions
   * - avoids creating notifications when the actor and target are blocked
   * - inserts the notification row into the database
   * - emits a realtime event to the recipient's user room after insertion
   *
   * How it works:
   * - checks for blocked relationships first to prevent noisy notifications
   * - stores `metadata` as JSONB so the caller can attach structured context
   * - includes the actor's username in the returned row for frontend display
   * - quietly ignores the "missing table" migration state (`42P01`) so startup
   *   or partially migrated environments do not break the app flow
   */
  async createNotification({ userId, actorUserId = null, type, message, metadata = {} }) {
    if (!userId || !type || !message) return;
    if (actorUserId && String(userId) === String(actorUserId)) return;

    if (actorUserId) {
      try {
        // Prevent notifications when the two users have blocked each other.
        const blockedResult = await pool.query(
          `SELECT 1 FROM user_blocks WHERE (blocker_user_id = $1 AND blocked_user_id = $2) OR (blocker_user_id = $2 AND blocked_user_id = $1) LIMIT 1`,
          [userId, actorUserId]
        );
        if (blockedResult.rowCount > 0) return;
      } catch (error) {
        if (error.code !== "42P01") throw error;
      }
    }

    try {
      // Insert the notification and return the row with actor display data.
      const insertResult = await pool.query(
        `
        INSERT INTO notifications (user_id, actor_user_id, type, message, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING
          id, user_id, actor_user_id, type, message, metadata, is_read, created_at,
          (SELECT u.username 
            FROM users u 
            WHERE u.id = notifications.actor_user_id 
            LIMIT 1) 
          AS actor_username
        `,
        [userId, actorUserId, type, message, JSON.stringify(metadata || {})]
      );

      // Push the new notification to the recipient if Socket.IO is available.
      const io = getIO();
      if (io && insertResult.rowCount > 0) {
        io.to(`user:${userId}`).emit(REALTIME_EVENTS.NOTIFICATION_CREATED, {
          notification: insertResult.rows[0],
        });
      }
    } catch (error) {
      if (error.code !== "42P01") throw error;
    }
  }

  /*  ========== Fetch Notifications  ========== */
  /**
   * Load the latest notifications for one user, newest first.
   *
   * Implementation details:
   * - joins the actor user's username so the frontend can show a friendly label
   * - uses LEFT JOIN so notifications still return even if the actor row is missing
   * - caps the result set to keep the inbox payload small and predictable
   */
  async getNotifications(userId) {
    const result = await pool.query(
      `
      SELECT n.id, n.type, n.message, n.metadata, n.is_read, n.created_at, n.actor_user_id, u.username AS actor_username
      FROM notifications n
      LEFT JOIN users u ON u.id = n.actor_user_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT 100
      `,
      [userId]
    );
    
    return result.rows;
  }

  /*  ========== Mark as Read  ========== */
  /**
   * Mark all unread notifications for a user as read.
   *
   * Implementation details:
   * - only updates rows that belong to the current user
   * - only touches unread rows to keep the update small
   */
  async readAll(userId) {
    await pool.query(
      `
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE user_id = $1 
        AND is_read = FALSE
      `,
      [userId]
    );
  }

  /**
   * Mark one notification as read for a specific user.
   *
   * Returns `true` when a row was updated, `false` otherwise.
   * The `user_id = $2` condition prevents users from marking other users'
   * notifications as read.
   */
  async readNotification(notificationId, userId) {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id, is_read`,
      [notificationId, userId]
    );

    return result.rowCount > 0;
  }
}

module.exports = new NotificationService();
