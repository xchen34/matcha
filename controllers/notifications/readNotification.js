const notificationService = require("../../services/notificationService");
const { parsePositiveInt } = require("./helpers");

/**
 * Mark a single notification as read for the authenticated user.
 *
 * Implementation details:
 * - Validates both the current user ID and the notification ID up front.
 * - Delegates the ownership-aware update to `notificationService.readNotification()`
 *   so the service layer controls which rows are eligible.
 * - Returns a 404 when the notification does not exist or does not belong to
 *   the current user.
 * - Treats a missing notifications table as a non-fatal state and responds
 *   with a clear migration-related error message.
 */
async function readNotification(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.userId);
    const notificationId = parsePositiveInt(req.params.id);

    if (!currentUserId) return res.status(400).json({ error: "authenticated user is required" });
    
    if (!notificationId) return res.status(400).json({ error: "Invalid notification id" });

    const found = await notificationService.readNotification(notificationId, currentUserId);
    if (!found) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ message: "Notification marked as read" });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.status(404).json({ error: "Notifications table is not available yet" });
    }
    return next(error);
  }
}

module.exports = { readNotification };
