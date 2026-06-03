import { useCallback, useState } from "react";
import {
  deleteChatConversation,
  deleteChatMessage,
  sendChatMessage,
} from "./api.js";
import { parseQuotedMessageContent } from "./quoteUtils.js";
import { dedupeMessages } from "../utils/messageFormat.js";

// 聊天消息相关操作的 hook。
// 负责：
// 1) 发送消息
// 2) 删除会话
// 3) 删除单条消息
// 4) 管理 sending / deleting 状态
const MAX_CHAT_MESSAGE_LENGTH = 500;

export function useMessageActions(
  currentUser,
  conversation,
  setConversation,
  setMessages,
  setError,
  navigate,
) {
  // 发送中状态。
  const [sending, setSending] = useState(false);

  // 删除会话中状态。
  const [deletingConversation, setDeletingConversation] = useState(false);

  // 当前正在删除的消息 ID。
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  // 发送消息。
  const handleSend = useCallback(
    async (body, quotedMessage, setBody, setQuotedMessage) => {
      // 当前用户 ID。
      const currentUserId = Number(currentUser?.id) || null;

      // 去掉首尾空白后的正文。
      const trimmed = String(body || "").trim();

      // 没有正文、没有对方用户或没有登录，就直接不处理。
      if (
        !trimmed ||
        !conversation?.other_user?.id ||
        !currentUserId
      ) return;

      // 默认消息内容就是正文。
      let content = trimmed;

      // 如果用户正在引用别人的消息，就把 quote 拼进去。
      if (quotedMessage?.content) {
        // 把引用内容拆开，取出真正的 replyText。
        const parsed = parseQuotedMessageContent(quotedMessage.content);

        // 优先使用解析出来的正文；没有的话就用原始内容。
        const actualQuoteText = parsed.replyText || quotedMessage.content;

        // 引用头。
        const quoteHeader = `Replying to message #${quotedMessage.id}:`;

        // 拼出最终发送内容：
        // 1) 引用头
        // 2) 引用块
        // 3) 用户自己输入的正文
        content = `${quoteHeader}\n> ${String(actualQuoteText).replace(/\n/g, "\n> ")}\n\n${trimmed}`;
      }

      // 进入发送状态。
      setSending(true);

      // 先清空错误。
      setError("");

      try {
        // 调用 API 发送消息。
        const payload = await sendChatMessage(
          { id: currentUserId },
          Number(conversation.other_user.id),
          content,
        );

        // 如果后端回传了 message，就把它加到当前列表。
        if (payload?.message) {
          setMessages((prev) => dedupeMessages([...prev, payload.message]));
        }

        // 发送成功后清空输入框和引用。
        setBody("");
        setQuotedMessage(null);
      } catch (err) {
        // 发送失败就显示错误。
        setError(err?.message || "Unable to send message");
      } finally {
        // 不管成功失败都退出发送中状态。
        setSending(false);
      }
    },
    [conversation, currentUser, setError, setMessages],
  );

  // 删除会话。
  const handleDeleteConversation = useCallback(async () => {
    // 当前用户 ID。
    const currentUserId = Number(currentUser?.id) || null;

    // 当前会话 ID。
    const activeConversationId = Number(conversation?.id) || null;

    // 参数不完整就不处理。
    if (!activeConversationId || !currentUserId) return;

    // 删除前先让用户确认。
    const confirmed = window.confirm(
      "Are you sure you want to delete this chat from your inbox? This only affects your side.",
    );

    // 用户取消就直接返回。
    if (!confirmed) return;

    // 进入删除状态。
    setDeletingConversation(true);

    // 先清空错误。
    setError("");

    try {
      // 调用 API 删除会话。
      await deleteChatConversation({ id: currentUserId }, activeConversationId);

      // 删除成功后跳回消息列表，并带一个状态告诉列表页把这个会话移除。
      navigate("/messages", {
        replace: true,
        state: { removedConversationId: activeConversationId },
      });
    } catch (err) {
      // 删除失败就显示错误。
      setError(err?.message || "Unable to delete conversation");
    } finally {
      // 退出删除状态。
      setDeletingConversation(false);
    }
  }, [conversation, currentUser, navigate, setError]);

  // 删除单条消息。
  const handleDeleteMessage = useCallback(
    async (message, setQuotedMessage) => {
      // 当前用户 ID。
      const currentUserId = Number(currentUser?.id) || null;

      // 当前会话 ID。
      const activeConversationId = Number(conversation?.id) || null;

      // 参数不完整就不处理。
      if (!activeConversationId || !currentUserId || !message?.id) return;

      // 标记当前正在删哪条消息。
      setDeletingMessageId(message.id);

      try {
        // 调用 API 删除消息。
        await deleteChatMessage(
          { id: currentUserId },
          activeConversationId,
          message.id,
        );

        // 把已删除的消息从本地列表移掉。
        setMessages((prev) =>
          prev.filter((m) => Number(m.id) !== Number(message.id)),
        );

        // 如果当前引用的就是这条被删的消息，就清空引用。
        setQuotedMessage((prev) =>
          Number(prev?.id) === Number(message.id) ? null : prev,
        );
      } finally {
        // 清空 deleting 状态。
        setDeletingMessageId(null);
      }
    },
    [conversation, currentUser, setMessages],
  );

  // 返回给页面使用。
  return {
    sending,
    deletingConversation,
    deletingMessageId,
    handleSend,
    handleDeleteConversation,
    handleDeleteMessage,
    MAX_CHAT_MESSAGE_LENGTH,
  };
}
