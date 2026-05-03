const chatService = require("../../services/chatService");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const {
  MAX_CHAT_MESSAGE_LENGTH,
  getMessageLengthForLimit,
  isUserActiveInConversation,
  parsePositiveInt,
  fetchConnectionStatus,
  ensureMatchRequired,
} = require("./helpers");

async function sendMessage(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    const recipientUserId = parsePositiveInt(req.body?.recipient_user_id);
    if (!currentUserId || !recipientUserId) {
      return res.status(400).json({ error: "x-user-id header and recipient_user_id body field are required" });
    }
    if (currentUserId === recipientUserId) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    const safeContent = String(req.body?.content || "").trim();
    if (!safeContent) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }
    if (getMessageLengthForLimit(safeContent) > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message text cannot exceed ${MAX_CHAT_MESSAGE_LENGTH} characters` });
    }

    const recipientExists = await chatService.checkUserExists(recipientUserId);
    if (!recipientExists) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const status = await fetchConnectionStatus(currentUserId, recipientUserId);
    ensureMatchRequired(status);

    const { conversationId, message } = await chatService.insertMessageAndUpdateLastMessageAt(
      currentUserId,
      recipientUserId,
      safeContent
    );

    const io = getIO();
    const recipientIsActive = isUserActiveInConversation(io, conversationId, recipientUserId);

    let finalMessage = message;
    let readEventPayload = null;

    if (recipientIsActive) {
      finalMessage = await chatService.markSingleMessageAsReadAndReturn(message.id) || message;
      readEventPayload = {
        conversation_id: conversationId,
        reader_user_id: recipientUserId,
        updated_count: 1,
      };
    }

    if (io) {
      const payload = { message: finalMessage };
      io.to(`user:${currentUserId}`).emit(REALTIME_EVENTS.CHAT_MESSAGE_CREATED, payload);
      io.to(`user:${recipientUserId}`).emit(REALTIME_EVENTS.CHAT_MESSAGE_CREATED, payload);

      if (readEventPayload) {
        io.to(`user:${currentUserId}`).emit(REALTIME_EVENTS.CHAT_CONVERSATION_READ, readEventPayload);
        io.to(`user:${recipientUserId}`).emit(REALTIME_EVENTS.CHAT_CONVERSATION_READ, readEventPayload);
      }
    }

    return res.status(201).json({ conversation_id: conversationId, message: finalMessage });
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

module.exports = { sendMessage };
