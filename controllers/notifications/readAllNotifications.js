const notificationService = require("../../services/notificationService");
const { parsePositiveInt } = require("./helpers");

async function readAllNotifications(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    if (!currentUserId) return res.status(400).json({ error: "x-user-id header is required" });

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
