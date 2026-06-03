const notificationService = require("../../services/notificationService");
const { parsePositiveInt } = require("./helpers");

/**
 * Mark every notification for the authenticated user as read.
 *
 * Implementation details:
 * - Validates the current user ID before calling into the service layer.
 * - Uses `notificationService.readAll()` to keep the bulk update logic out of
 *   the controller.
 * - Returns a simple confirmation message once the update completes.
 * - Treats the missing-table case as a harmless bootstrap state so the API can
 *   stay responsive while the schema is still being provisioned.
 */
async function readAllNotifications(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.userId);
    if (!currentUserId) return res.status(400).json({ error: "authenticated user is required" });

    await notificationService.readAll(currentUserId);
    
    return res.json({ message: "Notifications marked as read" });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ message: "Notifications table is not available yet" });
    }

    return next(error);
  }
}

module.exports = { readAllNotifications };
