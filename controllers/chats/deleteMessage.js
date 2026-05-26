const chatService = require("../../services/chatService");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const { parsePositiveInt } = require("./helpers");

async function deleteMessage(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.userId);
    const conversationId = parsePositiveInt(req.params.conversationId);
    const messageId = parsePositiveInt(req.params.messageId);
    if (!currentUserId || !conversationId || !messageId) {
      return res.status(400).json({
        error: "authenticated user, conversation id and message id are required",
      });
    }

    const conv = await chatService.getConversationParticipants(conversationId);
    if (!conv || (Number(currentUserId) !== Number(conv.user_a_id) && Number(currentUserId) !== Number(conv.user_b_id))) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messageValid = await chatService.checkMessageExistsAndValid(messageId, conversationId);
    if (!messageValid) {
      return res.status(404).json({ error: "Message not found" });
    }

    await chatService.deleteMessage(currentUserId, messageId, conversationId);

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
