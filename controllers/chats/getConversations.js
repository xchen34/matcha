const chatService = require("../../services/chatService");
const { isUserOnline } = require("../../services/presenceService");
const { parsePositiveInt } = require("./helpers");

// 获取当前用户的会话列表。
// 返回给前端的不是原始 SQL 行，而是已经整理好的 conversation card 数据结构。
async function getConversations(req, res, next) {
  try {
    // 当前请求必须能识别出登录用户。
    const currentUserId = parsePositiveInt(req.userId);
    if (!currentUserId) {
      return res.status(400).json({ error: "authenticated user is required" });
    }

    // 查出所有会话，服务层已经处理了未读数、最后消息、匹配状态等聚合字段。
    const rows = await chatService.getConversationsList(currentUserId);

    // 把数据库行转换成前端更好用的 JSON 结构。
    const conversations = rows.map((row) => ({
      conversation_id: row.conversation_id,
      other_user: {
        id: row.other_user_id,
        username: row.other_user_deleted ? "Deleted account" : row.other_username,
        first_name: row.other_user_deleted ? "" : row.first_name || "",
        last_name: row.other_user_deleted ? "" : row.last_name || "",
        is_online: row.other_user_deleted ? false : isUserOnline(row.other_user_id),
        primary_photo_url: row.other_user_deleted ? "" : row.other_primary_photo_url || "",
        is_deleted: Boolean(row.other_user_deleted),
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
    // schema 未初始化时，返回空列表而不是整页炸掉。
    if (error && error.code === "42P01") {
      return res.json({ conversations: [] });
    }
    
    return next(error);
  }
}

module.exports = { getConversations };
