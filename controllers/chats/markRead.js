const chatService = require("../../services/chatService");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const { parsePositiveInt } = require("./helpers");

async function markRead(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.userId);
    const conversationId = parsePositiveInt(req.params.conversationId);
    if (!currentUserId || !conversationId) {
      return res.status(400).json({ error: "authenticated user and conversation id are required" });
    }

    const conversation = await chatService.checkConversationValidAndUndeleted(currentUserId, conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const updatedCount = await chatService.markMessagesAsRead(currentUserId, conversationId);

    const io = getIO();
    if (io) {
      io.to(`user:${currentUserId}`).emit(REALTIME_EVENTS.CHAT_CONVERSATION_READ, {
        conversation_id: conversationId,
        reader_user_id: currentUserId,
        updated_count: updatedCount,
      });
      const otherUserId = conversation.other_user_id;
      if (otherUserId) {
        io.to(`user:${otherUserId}`).emit(REALTIME_EVENTS.CHAT_CONVERSATION_READ, {
          conversation_id: conversationId,
          reader_user_id: currentUserId,
          updated_count: updatedCount,
        });
      }
    }

    return res.json({ updated_count: updatedCount });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.status(503).json({ error: "Chat feature not available yet (missing schema)" });
    }
    
    return next(error);
  }
}

module.exports = { markRead };
