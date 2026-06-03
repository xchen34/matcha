const chatService = require("../../services/chatService");
const { isUserOnline } = require("../../services/presenceService");
const {
  parsePositiveInt,
  parseNonNegativeInt,
  fetchConnectionStatus,
} = require("./helpers");

// 获取某个会话的消息列表。
// 这个接口返回的不只是 messages，还会把前端聊天页需要的会话信息一起带回去。
async function getMessages(req, res, next) {
  try {
    // 当前登录用户 ID。
    const currentUserId = parsePositiveInt(req.userId);

    // 路由参数里的会话 ID。
    const conversationId = parsePositiveInt(req.params.conversationId);

    // limit：每页消息数。
    // 这里把用户传进来的值限制在 1~100 之间，默认 20，防止一次拉太多或传非法值。
    const limit = Math.min(
      100,
      Math.max(1, parseNonNegativeInt(req.query.limit, 20) || 20),
    );

    // 从哪一条开始往后翻页。
    const offset = parseNonNegativeInt(req.query.offset, 0);

    // 参数必须完整：没有用户或会话 ID 就直接报错。
    if (!currentUserId || !conversationId) {
      return res
        .status(400)
        .json({ error: "authenticated user and conversation id are required" });
    }

    // 先确认这个会话对当前用户是可见的：
    // 1) 当前用户确实是参与者
    // 2) 这个会话没有被当前用户删掉
    const conversation = await chatService.checkConversationValidAndUndeleted(
      currentUserId,
      conversationId,
    );

    // 不可见就当成没找到。
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // 会话里的另一位用户 ID。
    const otherUserId = conversation.other_user_id;

    // 读取双方关系状态：
    // - 是否匹配
    // - 是否拉黑
    // - 匹配时间
    const status = await fetchConnectionStatus(currentUserId, otherUserId);

    // 读取对方用户的公开资料，用于聊天页头部显示头像和名字。
    const otherUser = await chatService.getOtherUserDetails(otherUserId);

    // 进入聊天页时，把当前用户能看到的未读消息统一标记为已读。
    await chatService.markMessagesAsRead(currentUserId, conversationId);

    // 拉取消息历史。
    // 这里会故意多查 1 条，用来判断“还有没有下一页”。
    const historyRows = await chatService.getMessages(
      currentUserId,
      conversationId,
      limit,
      offset,
    );

    // 多查出来的那 1 条如果存在，说明还有更多历史消息可以继续加载。
    const hasMore = historyRows.length > limit;

    // 真正返回给前端的这一页数据，只保留 limit 条。
    const pagedRows = hasMore ? historyRows.slice(0, limit) : historyRows;

    // 前端聊天气泡希望按时间正序显示，所以这里把数据库倒序结果反转回来。
    const messages = pagedRows.reverse();

    // 返回给前端的结构：
    // - conversation: 会话头部信息
    // - messages: 当前页消息
    // - paging: 分页控制信息
    return res.json({
      conversation: {
        // 会话 ID。
        id: conversationId,
        other_user: {
          // 对方用户 ID；如果用户已被删，则仍然保留其 ID 方便前端显示“Deleted account”。
          id: otherUser?.id || otherUserId,
          // 如果对方账号不存在，用 Deleted account 兜底。
          username: otherUser?.username || "Deleted account",
          // 删除账号时不展示名字。
          first_name: otherUser?.first_name || "",
          // 删除账号时不展示名字。
          last_name: otherUser?.last_name || "",
          // 对方主头像 URL；如果没有则留空。
          primary_photo_url: otherUser?.primary_photo_url || "",
          // 对方是否在线。
          is_online: Boolean(otherUser) && isUserOnline(otherUserId),
          // 对方账号是否已删除。
          is_deleted: !otherUser,
        },
        // 当前双方是否互相喜欢成 match。
        is_match: !!status.is_match,
        // match 的时间，没有则 null。
        match_created_at: status.match_created_at || null,
        // 当前用户是否拉黑了对方。
        blocked_by_you: Boolean(status.blocked_by_you),
        // 对方是否拉黑了当前用户。
        blocked_you: Boolean(status.blocked_you),
      },
      // 当前页消息数组。
      messages,
      // 分页信息：limit/offset/还有没有更多。
      paging: { limit, offset, has_more: hasMore },
    });
  } catch (error) {
    // 如果 chat schema 还没创建，返回空数据而不是直接炸掉。
    if (error && error.code === "42P01") {
      return res.json({ conversation: null, messages: [] });
    }

    // 业务错误直接透传状态码和提示。
    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({ error: error.message });
    }

    // 其他未知错误交给全局错误处理中间件。
    return next(error);
  }
}

module.exports = { getMessages };
