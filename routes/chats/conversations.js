const express = require("express");
const { authSensitiveLimiter } = require("../../middleware/rateLimit");
const chatController = require("../../controllers/chats");

const router = express.Router();

// 前端当前正式使用的路由：聊天列表/客户端 API 会走这个路径。
router.delete("/chats/:conversationId", authSensitiveLimiter, chatController.deleteConversation);

router.get("/chats", chatController.getConversations);
router.post("/chats/conversations", chatController.createConversation);

module.exports = router;
