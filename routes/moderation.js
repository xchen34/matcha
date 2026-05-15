const express = require("express");
const moderationController = require("../controllers/moderation");

const router = express.Router();

/*  ========== MODERATION  ========== */
router.get("/moderation/blocked-users", moderationController.getBlockedUsers);
router.get("/users/:id/moderation-status", moderationController.getStatus);

/*  ========== REPORT USER  ========== */
router.post("/users/:id/report-fake", moderationController.reportUser);

/*  ========== BLOCK/UNBLOCK USERS  ========== */
router.post("/users/:id/block", moderationController.blockUser);
router.delete("/users/:id/block", moderationController.unblockUser);

module.exports = router;
