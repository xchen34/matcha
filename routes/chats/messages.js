const express = require("express");
const { authSensitiveLimiter } = require("../../middleware/rateLimit");
const chatController = require("../../controllers/chats");

const router = express.Router();

/*  ========== MESSAGES  ========== */
router.get("/chats/:conversationId/messages", chatController.getMessages);
router.post("/chats/messages", chatController.sendMessage);
router.delete("/chats/:conversationId/messages/:messageId", authSensitiveLimiter, chatController.deleteMessage);

/*  ========== MARK AS READ  ========== */
router.post("/chats/:conversationId/read", chatController.markRead);

module.exports = router;
