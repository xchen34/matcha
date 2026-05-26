const notificationService = require("../../services/notificationService");
const { parsePositiveInt } = require("./helpers");

async function getNotifications(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.userId);
    if (!currentUserId) return res.status(400).json({ error: "authenticated user is required" });

    const rows = await notificationService.getNotifications(currentUserId);
    const unreadCount = rows.reduce((acc, row) => acc + (row.is_read ? 0 : 1), 0);

    return res.json({
      unread_count: unreadCount,
      notifications: rows.map((row) => ({
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
    if (error && error.code === "42P01") {
      return res.json({ unread_count: 0, notifications: [] });
    }
    return next(error);
  }
}

module.exports = { getNotifications };
