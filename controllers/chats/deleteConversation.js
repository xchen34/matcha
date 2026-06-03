const chatService = require("../../services/chatService");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const { parsePositiveInt } = require("./helpers");

// 当前用户“删除”一整个会话。
// 注意这里是软删除：只对当前用户隐藏，不会物理删除数据库会话记录。
async function deleteConversation(req, res, next) {
  try {
    // 参数校验：当前用户和会话 ID 都必须合法。
    const currentUserId = parsePositiveInt(req.userId);
    const conversationId = parsePositiveInt(req.params.conversationId);
    if (!currentUserId || !conversationId) {
      return res.status(400).json({ error: "authenticated user and conversation id required" });
    }

    // 先确认这个会话真的存在，而且当前用户是参与者之一。
    const conv = await chatService.getConversationParticipants(conversationId);
    if (!conv) {
      return res.status(404).json({ error: "Conversation introuvable" });
    }
    if (Number(currentUserId) !== Number(conv.user_a_id) && Number(currentUserId) !== Number(conv.user_b_id)) {
      return res.status(403).json({ error: "Accès refusé à cette conversation" });
    }

    // 记录当前用户删除了这个会话，并把该会话里消息也写入删除标记表。
    await chatService.markConversationDeleted(currentUserId, conversationId);

    // 实时通知当前用户端：会话已从列表移除。
    const io = getIO();
    if (io) {
      io.to(`user:${currentUserId}`).emit(REALTIME_EVENTS.CHAT_CONVERSATION_DELETED, {
        conversation_id: conversationId,
        user_id: currentUserId,
      });
    }

    return res.json({ success: true, conversation_id: conversationId });
  } catch (error) {
    return next(error);
  }
}

module.exports = { deleteConversation };
