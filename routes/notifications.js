const express = require("express");
const notificationController = require("../controllers/notifications");

const router = express.Router();

/*  ========== NOTIFICATIONS  ========== */
router.get("/notifications", notificationController.getNotifications);

/*  ========== MARK AS READ  ========== */
router.post("/notifications/read-all", notificationController.readAllNotifications);
router.post("/notifications/:id/read", notificationController.readNotification);

module.exports = router;
