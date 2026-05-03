const chatService = require("../../services/chatService");
const { parsePositiveInt, ensureConnectionAllowed } = require("./helpers");

async function createConversation(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    const otherUserId = parsePositiveInt(req.body?.other_user_id);

    if (!currentUserId || !otherUserId) {
      return res.status(400).json({ error: "x-user-id header and other_user_id body field are required" });
    }
    if (currentUserId === otherUserId) {
      return res.status(400).json({ error: "Cannot open chat with yourself" });
    }

    const status = await chatService.fetchConnectionStatus(currentUserId, otherUserId);
    ensureConnectionAllowed(status);

    const conversationId = await chatService.findOrCreateConversation(currentUserId, otherUserId);
    if (!conversationId) {
      return res.status(500).json({ error: "Unable to open conversation" });
    }

    return res.status(201).json({ conversation_id: conversationId });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.status(503).json({ error: "Chat feature not available yet (missing schema)" });
    }
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
}

module.exports = { createConversation };
