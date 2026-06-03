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

// 发送一条消息。
// 这个接口会做完整校验：用户身份、文本长度、对方存在、双方关系、数据库写入、实时广播。
async function sendMessage(req, res, next) {
  try {
    // 当前用户和收件人都必须是合法整数 ID。
    const currentUserId = parsePositiveInt(req.userId);
    const recipientUserId = parsePositiveInt(req.body?.recipient_user_id);
    if (!currentUserId || !recipientUserId) {
      return res.status(400).json({ error: "authenticated user and recipient_user_id body field are required" });
    }

    // 不允许给自己发消息。
    if (currentUserId === recipientUserId) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    // 消息内容必须有实际文本。
    const safeContent = String(req.body?.content || "").trim();
    if (!safeContent) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    // 长度限制要按“真正正文长度”算，避免 quote 影响。
    if (getMessageLengthForLimit(safeContent) > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message text cannot exceed ${MAX_CHAT_MESSAGE_LENGTH} characters` });
    }

    // 收件人必须存在。
    const recipientExists = await chatService.checkUserExists(recipientUserId);
    if (!recipientExists) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // 只能在已匹配且未拉黑的关系里发消息。
    const status = await fetchConnectionStatus(currentUserId, recipientUserId);
    ensureMatchRequired(status);

    // 插入消息，如果会话不存在则顺便创建会话，并刷新 last_message_at。
    const { conversationId, message } = await chatService.insertMessageAndUpdateLastMessageAt(
      currentUserId,
      recipientUserId,
      safeContent
    );

    // 如果对方此刻正在线打开这个会话，消息可以直接标成已读。
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

    // 给双方用户通道广播新消息；
    // 如果对方正在这个会话里，再额外广播一次已读状态更新。
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
    // schema 未初始化时给出明确提示。
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
