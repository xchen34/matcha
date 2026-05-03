const express = require("express");
const { authSensitiveLimiter } = require("../../middleware/rateLimit");
const chatController = require("../../controllers/chats");

const router = express.Router();

router.delete("/chats/:conversationId/messages/:messageId", authSensitiveLimiter, chatController.deleteMessage);
router.get("/chats/:conversationId/messages", chatController.getMessages);
router.post("/chats/:conversationId/read", chatController.markRead);
router.post("/chats/messages", chatController.sendMessage);

module.exports = router;
