import { useEffect, useState } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { useChatConversationRealtime } from "./hooks/useChatConversationRealtime.js";
import { useChatScroll } from "./hooks/useChatScroll.js";
import { useConversationData } from "./hooks/useConversationData.js";
import { useMessageActions } from "./hooks/useMessageActions.js";
import ChatConversationHeader from "./components/ChatConversationHeader.jsx";
import ChatMessagesList from "./components/ChatMessagesList.jsx";
import ChatInputForm from "./components/ChatInputForm.jsx";

/**
 * 聊天详情页容器组件（编排层）：
 * - 组装数据 hooks（会话数据、实时更新、滚动分页、消息操作）
 * - 把状态和回调分发给子组件（Header/List/Input）
 */
export default function ChatConversationPage({
  currentUser,
  embedded = false,
  quotedMessage: quotedMessageProp,
  setQuotedMessage: setQuotedMessageProp,
}) {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  // 基础本地 UI 状态。
  const currentUserId = Number(currentUser?.id) || null;
  const [error, setError] = useState("");
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [body, setBody] = useState("");
  const [localQuotedMessage, setLocalQuotedMessage] = useState(null);
  const quotedMessage = quotedMessageProp ?? localQuotedMessage;
  const setQuotedMessage = setQuotedMessageProp ?? setLocalQuotedMessage;

  // 会话主体数据（会话信息、消息列表、分页加载等）。
  const conversationData = useConversationData(currentUser, conversationId);
  const {
    loading,
    loadingMore,
    conversation,
    messages,
    hasMore,
    wasMatchedBefore,
    unmatchedAt,
    loadConversation,
    loadOlder,
  } = conversationData;

  // 消息动作（发送、删消息、删会话）统一收敛在一个 hook 里。
  const messageActions = useMessageActions(
    currentUser,
    conversation,
    conversationData.setConversation,
    conversationData.setMessages,
    setError,
    navigate,
  );
  const {
    sending,
    deletingConversation,
    deletingMessageId,
    handleSend,
    handleDeleteConversation,
    handleDeleteMessage,
  } = messageActions;

  // 消息列表滚动与上拉加载旧消息。
  const { listRef, handleScroll, saveScrollPositionBeforePrepend } = useChatScroll({
    messages,
    loadingMore,
    hasMore,
    loadOlder: () => loadOlder(listRef, saveScrollPositionBeforePrepend),
    currentUserId,
  });

  const activeConversationId = Number(conversation?.id) || null;

  // 只有“仍匹配且互相未拉黑”才允许发送消息。
  const canSend =
    Boolean(conversation?.is_match) &&
    !conversation?.blocked_by_you &&
    !conversation?.blocked_you &&
    !conversation?.other_user?.is_deleted;

  // 页面首次/会话切换后拉取一次完整会话数据。
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // 挂载聊天详情页 realtime 行为：
  // - join 当前会话房间
  // - 收到新消息后合并到列表
  // - 关系变化时刷新（如 unmatched）
  useChatConversationRealtime({
    conversationId,
    activeConversationId,
    currentUserId,
    otherUserId: conversation?.other_user?.id,
    loadConversation,
    navigate,
    setConversation: conversationData.setConversation,
    setMessages: conversationData.setMessages,
    setQuotedMessage,
    setWasMatchedBefore: conversationData.setWasMatchedBefore,
    setUnmatchedAt: conversationData.setUnmatchedAt,
  });

  const handleSendMessage = async (bodyText, quoted, clearBody, clearQuote) => {
    await handleSend(bodyText, quoted, clearBody, clearQuote);
  };

  const handleDeleteMsg = async (message) => {
    await handleDeleteMessage(message, setQuotedMessage);
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="shrink-0">
        <ChatConversationHeader
          conversation={conversation}
          embedded={embedded}
          deletingConversation={deletingConversation}
          onDelete={handleDeleteConversation}
        />
      </div>

      {error && <p className="shrink-0 text-sm text-primary-dark">{error}</p>}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatMessagesList
          messages={messages}
          loading={loading}
          loadingMore={loadingMore}
          listRef={listRef}
          handleScroll={handleScroll}
          currentUserId={currentUserId}
          conversation={conversation}
          expandedMessageId={expandedMessageId}
          setExpandedMessageId={setExpandedMessageId}
          deletingMessageId={deletingMessageId}
          quotedMessage={quotedMessage}
          setQuotedMessage={setQuotedMessage}
          onDelete={handleDeleteMsg}
          wasMatchedBefore={wasMatchedBefore}
          unmatchedAt={unmatchedAt}
        />
      </div>

      <div className="shrink-0">
        <ChatInputForm
          canSend={canSend}
          sending={sending}
          body={body}
          setBody={setBody}
          quotedMessage={quotedMessage}
          setQuotedMessage={setQuotedMessage}
          onSubmit={handleSendMessage}
        />
      </div>
    </section>
  );
}
