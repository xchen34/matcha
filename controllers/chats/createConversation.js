const chatService = require("../../services/chatService");
const { parsePositiveInt, ensureConnectionAllowed } = require("./helpers");

// 创建或打开一个聊天会话。
// 输入：
// - req.userId: 当前登录用户
// - req.body.other_user_id: 想要聊天的对方用户 ID
// 输出：
// - 成功：返回 conversation_id
// - 失败：返回明确的 4xx/5xx 错误
async function createConversation(req, res, next) {
  try {
    // 把传入的 ID 统一转成正整数，避免空值、字符串、非法数字等问题。
    const currentUserId = parsePositiveInt(req.userId);
    const otherUserId = parsePositiveInt(req.body?.other_user_id);

    // 当前用户和对方用户 ID 都必须存在。
    if (!currentUserId || !otherUserId) {
      return res.status(400).json({ error: "authenticated user and other_user_id body field are required" });
    }

    // 不能和自己创建聊天会话。
    if (currentUserId === otherUserId) {
      return res.status(400).json({ error: "Cannot open chat with yourself" });
    }

    // 先确认对方这个用户真的存在。
    const otherUserExists = await chatService.checkUserExists(otherUserId);
    if (!otherUserExists) {
      return res.status(404).json({ error: "User not found" });
    }

    // 查询两个人之间当前的关系状态：
    // - 是否互相关注/喜欢
    // - 是否有拉黑
    // - 是否允许发消息
    const status = await chatService.fetchConnectionStatus(currentUserId, otherUserId);

    // 如果关系不允许建聊天，会在这里抛出错误（例如没匹配、被拉黑等）。
    ensureConnectionAllowed(status);

    // 找到已有会话，或者新建一个会话。
    const conversationId = await chatService.findOrCreateConversation(currentUserId, otherUserId);
    if (!conversationId) {
      return res.status(500).json({ error: "Unable to open conversation" });
    }

    // 前端只需要会话 ID 就能跳转到 /messages/:id。
    return res.status(201).json({ conversation_id: conversationId });
  } catch (error) {
    // 如果 chat schema 还没初始化，给一个更友好的提示。
    if (error && error.code === "42P01") {
      return res.status(503).json({ error: "Chat feature not available yet (missing schema)" });
    }
    // 如果是业务校验错误，直接把状态码和 message 返回给前端。
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }
    // 其他未知错误交给全局错误处理中间件。
    return next(error);
  }
}

module.exports = { createConversation };
