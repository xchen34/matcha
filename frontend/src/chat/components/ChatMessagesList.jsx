import { useMemo } from "react";
import ChatConversationMessage from "./ChatConversationMessage.jsx";
import ChatConversationStatusBadge from "./ChatConversationStatusBadge.jsx";
import { dateKey } from "../utils/messageFormat.js";

/**
 * 消息列表组件：负责渲染滚动容器、消息行、列表底部状态徽章。
 *
 * Props 字典（核心）：
 * - messages: array，消息数组（值）
 * - loading/loadingMore: boolean，加载状态（值）
 * - listRef: ref，滚动容器引用（值）
 * - handleScroll: function，滚动触发加载旧消息（函数）
 * - currentUserId: number，当前用户 ID（值）
 * - conversation: object，会话状态（值）
 * - expandedMessageId/setExpandedMessageId: 展开消息控制（值+函数）
 * - deletingMessageId: number|null，正在删除的消息 ID（值）
 * - setQuotedMessage: function，设置引用消息（函数）
 * - onDelete: function，删除消息（函数）
 */
export default function ChatMessagesList({
  messages,
  loading,
  loadingMore,
  listRef,
  handleScroll,
  currentUserId,
  conversation,
  expandedMessageId,
  setExpandedMessageId,
  deletingMessageId,
  quotedMessage,
  setQuotedMessage,
  onDelete,
  wasMatchedBefore,
  unmatchedAt,
}) {
  // 预处理消息：
  // 1) 计算是否显示“日期分隔”；
  // 2) 判断是否我发送的（左右对齐）；
  // 3) 过滤掉系统匹配提示文案（改由底部状态徽章呈现）。
  const groupedMessages = useMemo(() => {
    const allGrouped = messages.map((msg, index) => ({
      msg,
      showDay:
        index === 0 || dateKey(messages[index - 1]?.created_at) !== dateKey(msg?.created_at),
      isMine: Number(msg?.sender_user_id) === currentUserId,
      showMatchBadge: index === 0 && conversation?.is_match && conversation?.match_created_at,
    }));

    return allGrouped.filter(
      (item) =>
        !item.msg.content?.includes("You are no longer matched") &&
        !item.msg.content?.includes("You matched with"),
    );
  }, [messages, currentUserId, conversation?.is_match, conversation?.match_created_at]);

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 min-w-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3"
    >
      {/* 顶部状态：初始加载/分页加载/空列表 */}
      {loading && <p className="text-sm text-slate-500">Loading messages...</p>}
      {loadingMore && <p className="text-xs text-slate-400"> Loading older messages...</p>}
      {!loading && groupedMessages.length === 0 && (
        <p className="text-sm text-slate-500">You matched. Say hi to start the conversation.</p>
      )}

      <ul className="w-full min-w-0 space-y-2">
        {groupedMessages.map(({ msg, showDay, isMine }) => (
          <ChatConversationMessage
            key={`msg-${msg.id}`}
            msg={msg}
            showDay={showDay}
            isMine={isMine}
            conversation={conversation}
            currentUserId={currentUserId}
            expandedMessageId={expandedMessageId}
            setExpandedMessageId={setExpandedMessageId}
            deletingMessageId={deletingMessageId}
            onQuote={setQuotedMessage}
            onDelete={onDelete}
          />
        ))}

        {/* 列表底部关系状态提示（匹配/取消匹配/拉黑） */}
        <ChatConversationStatusBadge
          conversation={conversation}
          groupedMessages={groupedMessages}
          messages={messages}
          wasMatchedBefore={wasMatchedBefore}
          unmatchedAt={unmatchedAt}
        />
      </ul>
    </div>
  );
}
