const express = require("express");
const pool = require("../db");

const router = express.Router();

function parseCurrentUserId(req, res) {
  const rawUserId = req.header("x-user-id");
  const userId = Number(rawUserId);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ error: "x-user-id header requis" });
    return null;
  }
  return userId;
}

router.get("/notifications", async (req, res, next) => {
  try {
    const currentUserId = parseCurrentUserId(req, res);
    if (!currentUserId) return;

    const result = await pool.query(
      `
      SELECT
        n.id,
        n.type,
        n.message,
        n.metadata,
        n.is_read,
        n.created_at,
        n.actor_user_id,
        u.username AS actor_username
      FROM notifications n
      LEFT JOIN users u ON u.id = n.actor_user_id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT 100
      `,
      [currentUserId],
    );

    const unreadCount = result.rows.reduce(
      (acc, row) => acc + (row.is_read ? 0 : 1),
      0,
    );

    return res.json({
      unread_count: unreadCount,
      notifications: result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        message: row.message,
        metadata: row.metadata,
        is_read: row.is_read,
        created_at: row.created_at,
        actor_user_id: row.actor_user_id,
        actor_username: row.actor_username,
      })),
    });
  } catch (error) {
    // Keep the bell usable if DB migration has not been executed yet.
    if (error && error.code === "42P01") {
      return res.json({ unread_count: 0, notifications: [] });
    }
    return next(error);
  }
});

router.post("/notifications/read-all", async (req, res, next) => {
  try {
    const currentUserId = parseCurrentUserId(req, res);
    if (!currentUserId) return;

    await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
      `,
      [currentUserId],
    );

    return res.json({ message: "Notifications marked as read" });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ message: "Notifications table is not available yet" });
    }
    return next(error);
  }
});

router.post("/notifications/:id/read", async (req, res, next) => {
  try {
    const currentUserId = parseCurrentUserId(req, res);
    if (!currentUserId) return;

    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: "Notification id invalide" });
    }

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id, is_read
      `,
      [notificationId, currentUserId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Notification introuvable" });
    }

    return res.json({ message: "Notification marked as read" });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res
        .status(404)
        .json({ error: "Notifications table is not available yet" });
    }
    return next(error);
  }
});

module.exports = router;
