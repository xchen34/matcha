const chatService = require("../../services/chatService");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const { parsePositiveInt } = require("./helpers");

// 把当前会话里“发给当前用户”的未读消息标为已读。
async function markRead(req, res, next) {
  try {
    // 当前用户和会话 ID 都要合法。
    const currentUserId = parsePositiveInt(req.userId);
    const conversationId = parsePositiveInt(req.params.conversationId);
    if (!currentUserId || !conversationId) {
      return res.status(400).json({ error: "authenticated user and conversation id are required" });
    }

    // 先确认这个会话对当前用户可见。
    const conversation = await chatService.checkConversationValidAndUndeleted(currentUserId, conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // 实际更新 unread -> read，并返回更新了多少条。
    const updatedCount = await chatService.markMessagesAsRead(currentUserId, conversationId);

    // 把已读状态同步给当前用户和对方用户的 realtime 通道。
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
    // schema 未初始化时返回明确提示。
    if (error && error.code === "42P01") {
      return res.status(503).json({ error: "Chat feature not available yet (missing schema)" });
    }
    
    return next(error);
  }
}

module.exports = { markRead };
