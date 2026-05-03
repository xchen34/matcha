const express = require("express");
const { authSensitiveLimiter } = require("../../middleware/rateLimit");
const chatController = require("../../controllers/chats");

const router = express.Router();

// Canonical route used by frontend API client.
router.delete("/chats/:conversationId", authSensitiveLimiter, chatController.deleteConversation);
// Backward compatibility for older clients that used /api/:conversationId.
router.delete("/:conversationId", authSensitiveLimiter, chatController.deleteConversation);

router.get("/chats", chatController.getConversations);
router.post("/chats/conversations", chatController.createConversation);

module.exports = router;
