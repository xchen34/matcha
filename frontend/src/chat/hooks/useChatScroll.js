import { useEffect, useRef } from "react";

// 聊天消息列表滚动控制 hook。
// 它负责三件事：
// 1) 新消息来时自动滚到底部
// 2) 用户滚到顶部时加载更旧的消息
// 3) 在“前插旧消息”后维持滚动位置不跳动
export function useChatScroll({
  messages,
  loadingMore,
  hasMore,
  loadOlder,
  currentUserId,
}) {
  // 消息列表 DOM 引用。
  const listRef = useRef(null);

  // 在前插旧消息前，记录当前滚动位置。
  const prependingRef = useRef(null);

  // 当 messages 更新时，决定是否自动滚到底部。
  useEffect(() => {
    // 取出 DOM 元素。
    const el = listRef.current;

    // 没有 DOM 就不处理。
    if (!el) return;

    // 如果当前正在前插旧消息，就不要触发自动滚动。
    if (prependingRef.current) return;

    // 找出最后一条消息。
    const lastMsg = messages[messages.length - 1];

    // 判断最后一条是不是我发的。
    const isMine = Number(lastMsg?.sender_user_id) === Number(currentUserId);

    // 判断用户是不是已经接近列表底部。
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;

    // 如果接近底部，或者最后一条是我发的，就自动滚到最底下。
    if (isNearBottom || isMine) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, currentUserId]);

  // 用户滚动时的处理函数。
  const handleScroll = () => {
    // 取出 DOM 元素。
    const el = listRef.current;

    // 没有元素就不处理。
    if (!el) return;

    // 如果滚到顶部附近，并且还有更多旧消息，就触发加载。
    if (el.scrollTop <= 40 && hasMore && !loadingMore) {
      loadOlder();
    }
  };

  // 在 messages 更新后，如果是“前插旧消息”，就修正 scrollTop。
  useEffect(() => {
    // 取出 DOM 元素。
    const el = listRef.current;

    // 没有元素或没有前插记录，就不处理。
    if (!el || !prependingRef.current) return;

    // 读取前插前的滚动信息。
    const { top, height } = prependingRef.current;

    // 当前新的 scrollHeight。
    const newHeight = el.scrollHeight;

    // 通过高度差把滚动条拉回原位。
    el.scrollTop = top + (newHeight - height);

    // 处理完后清除记录。
    prependingRef.current = null;
  }, [messages]);

  // 在加载旧消息之前先记住当前滚动位置。
  const saveScrollPositionBeforePrepend = () => {
    // 取出 DOM 元素。
    const el = listRef.current;

    // 没有元素就不记录。
    if (!el) return;

    // 保存当前 top 和高度。
    prependingRef.current = {
      top: el.scrollTop,
      height: el.scrollHeight,
    };
  };

  // 返回给组件使用。
  return {
    listRef,
    handleScroll,
    saveScrollPositionBeforePrepend,
  };
}
