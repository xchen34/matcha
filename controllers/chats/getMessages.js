const chatService = require("../../services/chatService");
const { isUserOnline } = require("../../services/presenceService");
const {
  parsePositiveInt,
  parseNonNegativeInt,
  fetchConnectionStatus,
} = require("./helpers");

async function getMessages(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.userId);
    const conversationId = parsePositiveInt(req.params.conversationId);
    const limit = Math.min(
      100,
      Math.max(1, parseNonNegativeInt(req.query.limit, 20) || 20),
    );
    const offset = parseNonNegativeInt(req.query.offset, 0);

    if (!currentUserId || !conversationId) {
      return res
        .status(400)
        .json({ error: "authenticated user and conversation id are required" });
    }

    const conversation = await chatService.checkConversationValidAndUndeleted(
      currentUserId,
      conversationId,
    );
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const otherUserId = conversation.other_user_id;
    const status = await fetchConnectionStatus(currentUserId, otherUserId);
    const otherUser = await chatService.getOtherUserDetails(otherUserId);

    await chatService.markMessagesAsRead(currentUserId, conversationId);

    const historyRows = await chatService.getMessages(
      currentUserId,
      conversationId,
      limit,
      offset,
    );
    const hasMore = historyRows.length > limit;
    const pagedRows = hasMore ? historyRows.slice(0, limit) : historyRows;
    const messages = pagedRows.reverse();

    return res.json({
      conversation: {
        id: conversationId,
        other_user: {
          id: otherUser?.id || otherUserId,
          username: otherUser?.username || "Deleted account",
          first_name: otherUser?.first_name || "",
          last_name: otherUser?.last_name || "",
          primary_photo_url: otherUser?.primary_photo_url || "",
          is_online: Boolean(otherUser) && isUserOnline(otherUserId),
          is_deleted: !otherUser,
        },
        is_match: !!status.is_match,
        match_created_at: status.match_created_at || null,
        blocked_by_you: Boolean(status.blocked_by_you),
        blocked_you: Boolean(status.blocked_you),
      },
      messages,
      paging: { limit, offset, has_more: hasMore },
    });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ conversation: null, messages: [] });
    }
    
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }

    return next(error);
  }
}

module.exports = { getMessages };
