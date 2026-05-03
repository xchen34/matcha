const notificationService = require("../../services/notificationService");
const { parsePositiveInt } = require("./helpers");

async function readNotification(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    const notificationId = parsePositiveInt(req.params.id);

    if (!currentUserId) return res.status(400).json({ error: "x-user-id header is required" });
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
