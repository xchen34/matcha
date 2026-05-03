const express = require("express");
const notificationController = require("../controllers/notifications");

const router = express.Router();

router.get("/notifications", notificationController.getNotifications);
router.post("/notifications/read-all", notificationController.readAllNotifications);
router.post("/notifications/:id/read", notificationController.readNotification);

module.exports = router;
