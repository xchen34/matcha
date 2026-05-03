const chatService = require("../../services/chatService");
const { isUserOnline } = require("../../realtime/presence");
const { parsePositiveInt } = require("./helpers");

async function getConversations(req, res, next) {
  try {
    const currentUserId = parsePositiveInt(req.header("x-user-id"));
    if (!currentUserId) {
      return res.status(400).json({ error: "x-user-id header is required" });
    }

    const rows = await chatService.getConversationsList(currentUserId);
    const conversations = rows.map((row) => ({
      conversation_id: row.conversation_id,
      other_user: {
        id: row.other_user_id,
        username: row.other_username,
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        is_online: isUserOnline(row.other_user_id),
        primary_photo_url: row.other_primary_photo_url || "",
      },
      last_message: row.last_message_content
        ? {
            sender_user_id: row.last_message_sender_id,
            content: row.last_message_content,
            created_at: row.last_message_created_at,
          }
        : null,
      unread_count: Number(row.unread_count ?? 0),
      is_match: !!row.is_match,
      blocked_by_you: Boolean(row.blocked_by_you),
      blocked_you: Boolean(row.blocked_you),
    }));

    return res.json({ conversations });
  } catch (error) {
    if (error && error.code === "42P01") {
      return res.json({ conversations: [] });
    }
    return next(error);
  }
}

module.exports = { getConversations };
