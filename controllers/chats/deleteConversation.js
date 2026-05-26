const chatService = require("../../services/chatService");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const { parsePositiveInt } = require("./helpers");

async function deleteConversation(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.userId);
    const conversationId = parsePositiveInt(req.params.conversationId);
    if (!currentUserId || !conversationId) {
      return res.status(400).json({ error: "authenticated user and conversation id required" });
    }

    const conv = await chatService.getConversationParticipants(conversationId);
    if (!conv) {
      return res.status(404).json({ error: "Conversation introuvable" });
    }
    if (Number(currentUserId) !== Number(conv.user_a_id) && Number(currentUserId) !== Number(conv.user_b_id)) {
      return res.status(403).json({ error: "Accès refusé à cette conversation" });
    }

    await chatService.markConversationDeleted(currentUserId, conversationId);

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
