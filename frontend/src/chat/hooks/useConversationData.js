import { useCallback, useState } from "react";
import { fetchConversationMessages, markConversationAsRead } from "./api.js";
import { dedupeMessages } from "../utils/messageFormat.js";

// 每页消息数量。
const PAGE_SIZE = 18;

// 聊天详情页的数据加载 hook。
// 负责：
// 1) 首次加载当前会话
// 2) 分页加载更旧的消息
// 3) 保存 conversation/messages/loading/分页状态
export function useConversationData(currentUser, conversationId) {
  // 首次加载状态。
  const [loading, setLoading] = useState(false);

  // 加载旧消息时的状态。
  const [loadingMore, setLoadingMore] = useState(false);

  // 错误信息。
  const [error, setError] = useState("");

  // 当前会话对象。
  const [conversation, setConversation] = useState(null);

  // 当前已加载的消息列表。
  const [messages, setMessages] = useState([]);

  // 当前分页偏移量。
  const [offset, setOffset] = useState(0);

  // 还有没有更多旧消息。
  const [hasMore, setHasMore] = useState(false);

  // 是否曾经匹配过。
  const [wasMatchedBefore, setWasMatchedBefore] = useState(false);

  // 取消匹配时间。
  const [unmatchedAt, setUnmatchedAt] = useState(null);

  // 首次加载会话数据。
  const loadConversation = useCallback(async () => {
    // 没登录用户或没有会话 ID 时，不做任何事。
    if (!currentUser?.id || !conversationId) return;

    // 进入 loading 状态。
    setLoading(true);
    setError("");

    try {
      // 拉取第一页消息和会话信息。
      const data = await fetchConversationMessages(currentUser, conversationId, {
        limit: PAGE_SIZE,
        offset: 0,
      });

      // 去重后的消息列表。
      const nextMessages = dedupeMessages(data?.messages || []);

      // 会话对象。
      const conv = data?.conversation || null;

      // 保存会话与消息。
      setConversation(conv);
      setMessages(nextMessages);

      // 检查消息里有没有“取消匹配”系统文案。
      const hasUnmatchMessage = nextMessages.some((msg) =>
        msg.content?.includes("You are no longer matched"),
      );

      // 如果有取消匹配文案，而且会话已经不是 match，就记录历史状态。
      if (hasUnmatchMessage && !conv?.is_match) {
        setWasMatchedBefore(true);
        setUnmatchedAt(new Date());
      }

      // 下一次加载旧消息时，从当前已加载条数开始。
      setOffset(nextMessages.length);

      // 设置是否还有更多消息可加载。
      setHasMore(Boolean(data?.paging?.has_more));

      // 加载完后，把当前会话标记为已读。
      if (conv?.id) {
        await markConversationAsRead(currentUser, conv.id).catch(() => {});
      }
    } catch (err) {
      // 出错时保存错误信息，方便页面显示。
      setError(err?.message || "Unable to load conversation");
    } finally {
      // 不管成功失败都退出 loading。
      setLoading(false);
    }
  }, [conversationId, currentUser]);

  // 加载更旧的消息。
  const loadOlder = useCallback(
    async (listRef, saveScrollPositionBeforePrepend) => {
      // 没登录、没会话、没有更多、或者已经在加载中，就不处理。
      if (!currentUser?.id || !conversationId || !hasMore || loadingMore)
        return;

      // 当前列表 DOM。
      const listEl = listRef.current;

      // 没有 DOM 就不处理。
      if (!listEl) return;

      // 开始加载旧消息。
      setLoadingMore(true);

      // 先保存滚动位置，等旧消息插入后再恢复。
      saveScrollPositionBeforePrepend();

      try {
        // 请求下一页旧消息。
        const data = await fetchConversationMessages(
          currentUser,
          conversationId,
          { limit: PAGE_SIZE, offset },
        );

        // 去重后得到旧消息数组。
        const olderMessages = dedupeMessages(data?.messages || []);

        // 如果真的有消息，就前插到列表前面。
        if (olderMessages.length > 0) {
          setMessages((prev) => dedupeMessages([...olderMessages, ...prev]));
          setOffset((prev) => prev + olderMessages.length);
        }

        // 更新“还有没有更多”。
        setHasMore(Boolean(data?.paging?.has_more));
      } finally {
        // 无论成功失败都退出加载状态。
        setLoadingMore(false);
      }
    },
    [conversationId, currentUser, hasMore, loadingMore, offset],
  );

  // 把状态和方法返回给页面组件。
  return {
    loading,
    loadingMore,
    error,
    setError,
    conversation,
    setConversation,
    messages,
    setMessages,
    hasMore,
    wasMatchedBefore,
    setWasMatchedBefore,
    unmatchedAt,
    setUnmatchedAt,
    loadConversation,
    loadOlder,
  };
}
