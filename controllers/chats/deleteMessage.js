const chatService = require("../../services/chatService");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const { parsePositiveInt } = require("./helpers");

// 当前用户删除一条消息。
// 这里也是软删除：仅对当前用户隐藏，不一定代表数据库里真的物理删掉。
async function deleteMessage(req, res, next) {
  try {
    // 当前用户、会话 ID、消息 ID 都必须合法。
    const currentUserId = parsePositiveInt(req.userId);
    const conversationId = parsePositiveInt(req.params.conversationId);
    const messageId = parsePositiveInt(req.params.messageId);
    if (!currentUserId || !conversationId || !messageId) {
      return res.status(400).json({
        error: "authenticated user, conversation id and message id are required",
      });
    }

    // 先确认会话归属，防止跨会话删除。
    const conv = await chatService.getConversationParticipants(conversationId);
    if (!conv || (Number(currentUserId) !== Number(conv.user_a_id) && Number(currentUserId) !== Number(conv.user_b_id))) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // 确认这条消息真的存在于这个会话里。
    const messageValid = await chatService.checkMessageExistsAndValid(messageId, conversationId);
    if (!messageValid) {
      return res.status(404).json({ error: "Message not found" });
    }

    // 写入删除标记，让这条消息在当前用户视角里消失。
    await chatService.deleteMessage(currentUserId, messageId, conversationId);

    // 给当前用户通道发删除事件，前端可即时移除该消息。
    const io = getIO();
    if (io) {
      const payload = {
        conversation_id: conversationId,
        message_id: messageId,
        user_id: currentUserId,
      };
      io.to(`user:${currentUserId}`).emit(REALTIME_EVENTS.CHAT_MESSAGE_DELETED, payload);
    }

    return res.json({ success: true, conversation_id: conversationId, message_id: messageId });
  } catch (error) {
    // schema 未初始化时给出友好提示。
    if (error && error.code === "42P01") {
      return res.status(503).json({ error: "Chat feature not available yet (missing schema)" });
    }
    
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }

    return next(error);
  }
}

module.exports = { deleteMessage };
