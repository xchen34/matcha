import { useEffect } from "react";
import { markConversationAsRead } from "./api.js";
import {
  joinConversationRoom,
  leaveConversationRoom,
  onRealtimeEvent,
} from "@/realtime/socket.js";
import { REALTIME_EVENTS } from "@/realtime/events.js";
import { dedupeMessages } from "../utils/messageFormat.js";

// 聊天详情页专用的 realtime hook。
// 职责：
// 1) 进入会话时加入对应 room
// 2) 监听新消息、删消息、删会话、presence、match 变化
// 3) 收到事件后同步更新当前页面状态
export function useChatConversationRealtime({
  conversationId,
  activeConversationId,
  currentUserId,
  otherUserId,
  loadConversation,
  navigate,
  setConversation,
  setMessages,
  setQuotedMessage,
  setWasMatchedBefore,
  setUnmatchedAt,
}) {
  // 当 conversationId 变化时，自动加入对应房间。
  useEffect(() => {
    // 把路由参数转成数字。
    const id = Number(conversationId);

    // 非法 conversationId 直接不处理。
    if (!Number.isInteger(id) || id <= 0) return undefined;

    // 加入当前会话房间。
    joinConversationRoom(id);

    // 离开页面或切换会话时，从房间退出。
    return () => leaveConversationRoom(id);
  }, [conversationId]);

  // 监听当前会话相关的 realtime 事件。
  useEffect(() => {
    // 没有 active conversation 或当前用户时，不需要注册监听。
    if (!activeConversationId || !currentUserId) return undefined;

    // 新消息事件。
    const offCreated = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_MESSAGE_CREATED,
      ({ message }) => {
        // 只处理当前会话的消息。
        if (Number(message?.conversation_id) !== activeConversationId) return;

        // 把新消息追加到消息列表，并去重。
        setMessages((prev) => dedupeMessages([...prev, message]));

        // 如果新消息不是自己发的，就把这个会话标为已读。
        if (Number(message?.sender_user_id) !== currentUserId) {
          void markConversationAsRead(
            { id: currentUserId },
            activeConversationId,
          ).catch(() => {});
        }
      },
    );

    // 删除消息事件。
    const offDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_MESSAGE_DELETED,
      (payload) => {
        // 只处理当前会话的删除事件。
        if (Number(payload?.conversation_id) !== activeConversationId) return;

        // 把消息 ID 转成数字。
        const messageId = Number(payload?.message_id);

        // 非法 messageId 直接忽略。
        if (!Number.isInteger(messageId)) return;

        // 从当前消息列表移除这条消息。
        setMessages((prev) => prev.filter((m) => Number(m.id) !== messageId));

        // 如果当前正在引用这条消息，就把引用清空。
        setQuotedMessage((prev) =>
          Number(prev?.id) === messageId ? null : prev,
        );
      },
    );

    // 会话删除事件。
    const offConversationDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_CONVERSATION_DELETED,
      (payload) => {
        // 只处理当前会话的删除事件。
        if (Number(payload?.conversation_id) !== activeConversationId) return;

        // 被删后直接回到消息列表页。
        navigate("/messages", { replace: true });
      },
    );

    // 拉黑状态变化事件。
    const offBlockStatusChanged = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
      (payload) => {
        // 提取两个人的 user id。
        const userA = Number(payload?.user_a_id);
        const userB = Number(payload?.user_b_id);

        // 非法数据直接忽略。
        if (!Number.isInteger(userA) || !Number.isInteger(userB)) return;

        // 如果当前用户不在这段关系里，就不用处理。
        if (Number(currentUserId) !== userA && Number(currentUserId) !== userB)
          return;

        // 如果事件带了 conversation_id，但不是当前会话，就不处理。
        if (
          Number(payload?.conversation_id) &&
          Number(payload.conversation_id) !== activeConversationId
        ) return;

        // 拉黑状态更新后，重新加载会话。
        void loadConversation();
      },
    );

    // 对方在线状态变化事件。
    const offPresenceUpdate = onRealtimeEvent(
      REALTIME_EVENTS.PRESENCE_UPDATE,
      (payload) => {
        // 目标用户 ID。
        const targetUserId = Number(payload?.user_id);

        // 不是对方，就忽略。
        if (
          !Number.isInteger(targetUserId) ||
          targetUserId !== Number(otherUserId)
        ) return;

        // 更新当前会话里的对方在线状态。
        setConversation((prev) => {
          if (!prev?.other_user) return prev;

          return {
            ...prev,
            other_user: {
              ...prev.other_user,
              is_online: Boolean(payload.is_online),
              last_seen_at:
                payload.last_seen_at || prev.other_user.last_seen_at,
            },
          };
        });
      },
    );

    // match 状态变化事件。
    const offMatchStatusChanged = onRealtimeEvent(
      REALTIME_EVENTS.MATCH_STATUS_CHANGED,
      (payload) => {
        // 只关心对方的状态变化。
        if (Number(payload?.userId) !== Number(otherUserId)) return;

        // 用函数式更新来确保拿到最新状态。
        setConversation((prev) => {
          if (!prev) return prev;

          // 先记住原本是否已经 match。
          const wasMatched = prev.is_match;

          // 从 payload 读取新的 match 状态。
          const isNowMatched = payload.matched;

          // 如果原本有 match，但现在没了，就记录曾经匹配过和取消时间。
          if (wasMatched && !isNowMatched) {
            setWasMatchedBefore(true);
            setUnmatchedAt(new Date());
          }

          // 返回更新后的会话数据。
          return {
            ...prev,
            is_match: isNowMatched,
          };
        });
      },
    );

    // 组件卸载或依赖变化时，移除所有监听。
    return () => {
      offCreated();
      offDeleted();
      offConversationDeleted();
      offPresenceUpdate();
      offBlockStatusChanged();
      offMatchStatusChanged();
    };
  }, [
    activeConversationId,
    currentUserId,
    loadConversation,
    navigate,
    otherUserId,
    setConversation,
    setMessages,
    setQuotedMessage,
    setUnmatchedAt,
    setWasMatchedBefore,
  ]);
}
